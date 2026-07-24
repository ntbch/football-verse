import type { NextFunction, Request, Response } from 'express';
import http from 'node:http';
import https from 'node:https';
import type { IncomingHttpHeaders, RequestOptions } from 'node:http';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function forwardHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !HOP_BY_HOP.has(name.toLowerCase())));
}

export type ReadProxyOptions = {
  target: string;
  rewrite: (originalUrl: string) => string;
  timeoutMs?: number;
  retries?: number;
};

export function createReadProxyMiddleware(options: ReadProxyOptions) {
  const target = new URL(options.target);
  const transport = target.protocol === 'https:' ? https : http;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const retries = Math.max(0, Math.min(options.retries ?? 1, 2));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      next();
      return;
    }

    let attempt = 0;
    const send = (): void => {
      const rewritten = options.rewrite(req.originalUrl);
      const upstreamUrl = new URL(rewritten, target);
      const requestOptions: RequestOptions = {
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port,
        method: req.method,
        path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
        headers: { ...forwardHeaders(req.headers), host: upstreamUrl.host },
      };

      const upstream = transport.request(requestOptions, upstreamResponse => {
        const headers = forwardHeaders(upstreamResponse.headers);
        if (req.headers.authorization || req.originalUrl.startsWith('/api/v1/auth')) {
          headers['cache-control'] = 'private, no-store';
          headers.pragma = 'no-cache';
        }
        headers['x-gateway-retries'] = String(attempt);
        res.writeHead(upstreamResponse.statusCode ?? 502, headers);
        upstreamResponse.pipe(res);
      });

      upstream.setTimeout(timeoutMs, () => upstream.destroy(new Error('UPSTREAM_TIMEOUT')));
      upstream.on('error', error => {
        if (res.headersSent || res.writableEnded) return;
        if (attempt < retries) {
          attempt += 1;
          send();
          return;
        }
        const requestId = String(req.headers['x-request-id'] ?? '');
        const errorCode = 'code' in error ? String((error as Error & { code?: string }).code ?? error.name) : error.name;
        console.error(`[Gateway Read Proxy Error] [${requestId}] ${req.path} -> ${errorCode}`);
        res.status(502).json({
          success: false,
          message: 'Bad Gateway: Upstream service unavailable or timed out',
          requestId: requestId || undefined,
        });
      });
      req.once('aborted', () => upstream.destroy());
      upstream.end();
    };
    send();
  };
}
