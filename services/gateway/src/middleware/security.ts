import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { getConfig } from '../config';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export function cachePrivacyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.authorization || req.path.startsWith('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
}

export function browserSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (getConfig().appEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { corsOrigin } = getConfig();
  const origin = req.headers.origin;

  if (origin === corsOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, X-Request-Id, X-Minigame-Guest');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(origin && origin !== corsOrigin ? 403 : 204).end();
    return;
  }

  next();
}
