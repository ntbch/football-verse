import { createProxyMiddleware } from 'http-proxy-middleware';
import { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import { authenticateGameRequest } from './game-auth';
import { getConfig } from './config';
import { createReadProxyMiddleware } from './read-proxy';

export const PROXY_ROUTE_INVENTORY = [
  { mount: '/api/v1/game', upstream: 'career', auth: 'required' },
  { mount: '/api/v1', upstream: 'core', auth: 'passthrough' },
  { mount: '/matches', upstream: 'prediction', auth: 'passthrough' },
  { mount: '/standings', upstream: 'prediction', auth: 'passthrough' },
  { mount: '/game', upstream: 'career', auth: 'required' },
] as const;

const protectPrivateResponse = (
  proxyRes: IncomingMessage,
  req: IncomingMessage,
  _res: ServerResponse,
): void => {
  const originalUrl = 'originalUrl' in req && typeof req.originalUrl === 'string'
    ? req.originalUrl
    : req.url || '';

  if (req.headers.authorization || originalUrl.startsWith('/api/v1/auth')) {
    proxyRes.headers['cache-control'] = 'private, no-store';
    proxyRes.headers.pragma = 'no-cache';
  }
};

const handleProxyError = (
  err: Error,
  req: IncomingMessage,
  res: ServerResponse | Socket | any
): void => {
  const requestId = (req.headers && req.headers['x-request-id']) ? (req.headers['x-request-id'] as string) : '';
  const errorCode = 'code' in err ? String((err as Error & { code?: string }).code ?? err.name) : err.name;
  console.error(`[Gateway Proxy Error] [${requestId}] -> ${errorCode}`);

  if ('status' in res && typeof res.status === 'function') {
    (res as any).status(502).json({
      success: false,
      message: 'Bad Gateway: Upstream service unavailable or timed out',
      requestId: requestId || undefined
    });
  } else if ('writeHead' in res && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Bad Gateway: Upstream service unavailable or timed out',
      requestId: requestId || undefined
    }));
  }
};

export const setupProxy = (app: Express): void => {
  const { backendUrl, predictionServiceUrl, gameServiceUrl } = getConfig();

  // Block public external access to internal admin/ingestion routes at the Gateway boundary
  app.use('/api/v1/internal', (_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  // Route authenticated /api/v1/game/* requests to the Game Service
  app.use(
    '/api/v1/game',
    authenticateGameRequest,
    createReadProxyMiddleware({
      target: gameServiceUrl,
      rewrite: originalUrl => originalUrl.replace(/^\/api\/v1\/game/, '/game'),
    }),
    createProxyMiddleware({
      target: gameServiceUrl,
      changeOrigin: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathRewrite: (path) => `/game${path}`,
      on: {
        proxyRes: protectPrivateResponse,
        error: handleProxyError
      },
    })
  );

  // Route /api/v1/* to Spring Boot Core
  app.use(
    '/api/v1',
    createReadProxyMiddleware({
      target: backendUrl,
      rewrite: originalUrl => originalUrl,
    }),
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathRewrite: (path) => `/api/v1${path}`,
      on: {
        proxyRes: protectPrivateResponse,
        error: handleProxyError
      },
    })
  );

  // Route /matches/* to Python Prediction Service
  app.use(
    '/matches',
    createReadProxyMiddleware({
      target: predictionServiceUrl,
      rewrite: originalUrl => originalUrl,
    }),
    createProxyMiddleware({
      target: predictionServiceUrl,
      changeOrigin: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathRewrite: (path) => `/matches${path}`,
      on: {
        error: handleProxyError
      }
    })
  );

  // Route /standings/* to Python Prediction Service
  app.use(
    '/standings',
    createReadProxyMiddleware({
      target: predictionServiceUrl,
      rewrite: originalUrl => originalUrl,
    }),
    createProxyMiddleware({
      target: predictionServiceUrl,
      changeOrigin: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathRewrite: (path) => `/standings${path}`,
      on: {
        error: handleProxyError
      }
    })
  );

  // Route authenticated /game/* requests to the Game Service
  app.use(
    '/game',
    authenticateGameRequest,
    createReadProxyMiddleware({
      target: gameServiceUrl,
      rewrite: originalUrl => originalUrl,
    }),
    createProxyMiddleware({
      target: gameServiceUrl,
      changeOrigin: true,
      proxyTimeout: 15000,
      timeout: 15000,
      pathRewrite: (path) => `/game${path}`,
      on: {
        proxyRes: protectPrivateResponse,
        error: handleProxyError
      },
    })
  );
};
