import type { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';

import { logError } from '../logger';

type Entry = { count: number; resetAt: number };

type RateLimitResult = { count: number; resetAt: number };

export interface RateLimitStore {
  increment(key: string, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  billingIpnLimit?: number;
  /** Stricter bucket for credential endpoints (/api/v1/auth/**). */
  authLimit?: number;
  now?: () => number;
  store?: RateLimitStore;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  increment(key: string, windowMs: number): RateLimitResult {
    const timestamp = this.now();
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= timestamp) {
      entry = { count: 0, resetAt: timestamp + windowMs };
      this.entries.set(key, entry);
    }
    entry.count += 1;

    if (this.entries.size > 10_000) {
      for (const [entryKey, value] of this.entries) {
        if (value.resetAt <= timestamp) this.entries.delete(entryKey);
      }
    }
    return entry;
  }
}

const INCREMENT_WITH_TTL = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "return { count, redis.call('PTTL', KEYS[1]) }",
].join("\n");

export class RedisRateLimitStore implements RateLimitStore {
  private readonly client: Redis;

  constructor(redisUrl: string, client?: Redis) {
    this.client = client ?? new Redis(redisUrl, { connectTimeout: 2_000, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    this.client.on('error', () => undefined);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const result = await this.client.eval(INCREMENT_WITH_TTL, 1, key, windowMs) as [number, number];
    const ttl = result[1] > 0 ? result[1] : windowMs;
    return { count: result[0], resetAt: Date.now() + ttl };
  }

  async isReady(): Promise<boolean> {
    try {
      return await this.client.ping() === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

const ROUTE_GROUPS = {
  CORE: 'core',
  PREDICTION: 'prediction',
  BILLING_IPN: 'billing-ipn',
  AUTH: 'auth',
  OTHER: 'other',
} as const;
type RouteGroup = typeof ROUTE_GROUPS[keyof typeof ROUTE_GROUPS];

type RouteBucketSpec = {
  group: RouteGroup;
  match: (path: string) => boolean;
  limit: (options: RateLimitOptions) => number;
};

/**
 * Single source of truth for every rate-limit bucket: group name, route
 * matcher, and limit resolution live together. Ordered — first match wins.
 * Adding a bucket is one table entry.
 */
const ROUTE_BUCKETS: RouteBucketSpec[] = [
  {
    group: ROUTE_GROUPS.BILLING_IPN,
    match: (path) => path.endsWith('/billing/webhooks/sepay') || path.endsWith('/billing/webhooks/sepay-bankhub'),
    limit: (options) => options.billingIpnLimit ?? options.limit,
  },
  {
    // Credential endpoints get a dedicated, stricter IP bucket. Identifier
    // (account)-level failure lockout lives server-side in core-api's
    // AuthLoginThrottleService; this layer only shapes request rates.
    group: ROUTE_GROUPS.AUTH,
    match: (path) => path.startsWith('/api/v1/auth/'),
    limit: (options) => options.authLimit ?? options.limit,
  },
  { group: ROUTE_GROUPS.CORE, match: (path) => path.startsWith('/api/v1'), limit: (options) => options.limit },
  {
    group: ROUTE_GROUPS.PREDICTION,
    match: (path) => path.startsWith('/matches') || path.startsWith('/standings'),
    limit: (options) => options.limit,
  },
  { group: ROUTE_GROUPS.OTHER, match: () => true, limit: (options) => options.limit },
];

function resolveBucket(path: string): RouteBucketSpec {
  return ROUTE_BUCKETS.find((bucket) => bucket.match(path)) ?? ROUTE_BUCKETS[ROUTE_BUCKETS.length - 1];
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const now = options.now ?? Date.now;
  const store = options.store ?? new MemoryRateLimitStore(now);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS' || req.path === '/health' || req.path === '/ready' || req.path === '/metrics') {
      next();
      return;
    }

    const address = req.ip || req.socket?.remoteAddress || 'unknown';
    const bucket = resolveBucket(req.path);
    const limit = bucket.limit(options);
    const key = `${address}:${bucket.group}`;
    const apply = (entry: RateLimitResult): void => {
      const timestamp = now();
      const remaining = Math.max(limit - entry.count, 0);
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

      if (entry.count > limit) {
        const retryAfter = Math.max(Math.ceil((entry.resetAt - timestamp) / 1000), 1);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          requestId: req.headers['x-request-id'],
        });
        return;
      }
      next();
    };

    const failOpen = (error: unknown): void => {
      // Documented behavior: when the rate-limit store is unavailable the
      // gateway keeps serving (availability over throttling). Account-level
      // brute force remains bounded by core-api's login throttle.
      logError('rate-limit store failure, failing open', error instanceof Error ? error.message : String(error));
      next();
    };
    try {
      const result = store.increment(key, options.windowMs);
      if (result instanceof Promise) {
        void result.then(apply).catch(failOpen);
      } else {
        apply(result);
      }
    } catch (error) {
      failOpen(error);
    }
  };
}
