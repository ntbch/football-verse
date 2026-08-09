import type { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';

type Entry = { count: number; resetAt: number };

type RateLimitResult = { count: number; resetAt: number };

export interface RateLimitStore {
  increment(key: string, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  billingIpnLimit?: number;
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

function routeGroup(path: string): string {
  if (path.endsWith('/billing/webhooks/sepay') || path.endsWith('/billing/webhooks/sepay-bankhub')) return 'billing-ipn';
  if (path.startsWith('/api/v1')) return 'core';
  if (path.startsWith('/matches') || path.startsWith('/standings')) return 'prediction';
  return 'other';
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
    const group = routeGroup(req.path);
    const limit = group === 'billing-ipn' ? (options.billingIpnLimit ?? options.limit) : options.limit;
    const key = `${address}:${group}`;
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

    try {
      const result = store.increment(key, options.windowMs);
      if (result instanceof Promise) {
        void result.then(apply).catch(next);
      } else {
        apply(result);
      }
    } catch (error) {
      next(error);
    }
  };
}
