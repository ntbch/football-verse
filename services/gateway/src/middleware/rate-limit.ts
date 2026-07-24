import type { NextFunction, Request, Response } from 'express';

type Entry = { count: number; resetAt: number };

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

function routeGroup(path: string): string {
  if (path.startsWith('/api/v1/game') || path.startsWith('/game')) return 'game';
  if (path.startsWith('/api/v1')) return 'core';
  if (path.startsWith('/matches') || path.startsWith('/standings')) return 'prediction';
  return 'other';
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const entries = new Map<string, Entry>();
  const now = options.now ?? Date.now;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS' || req.path === '/health' || req.path === '/metrics') {
      next();
      return;
    }

    const timestamp = now();
    const address = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${address}:${routeGroup(req.path)}`;
    let entry = entries.get(key);
    if (!entry || entry.resetAt <= timestamp) {
      entry = { count: 0, resetAt: timestamp + options.windowMs };
      entries.set(key, entry);
    }
    entry.count += 1;

    const remaining = Math.max(options.limit - entry.count, 0);
    res.setHeader('X-RateLimit-Limit', options.limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.limit) {
      const retryAfter = Math.max(Math.ceil((entry.resetAt - timestamp) / 1000), 1);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        message: 'Too many requests',
        requestId: req.headers['x-request-id'],
      });
      return;
    }

    // Opportunistic cleanup keeps the in-process limiter bounded without timers.
    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= timestamp) entries.delete(entryKey);
      }
    }
    next();
  };
}
