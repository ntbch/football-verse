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

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { corsOrigin } = getConfig();
  const origin = req.headers.origin;

  if (origin === corsOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, X-Request-Id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}
