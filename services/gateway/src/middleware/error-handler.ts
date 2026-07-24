import { Request, Response, NextFunction } from 'express';

export function safeErrorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || '';
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal Gateway Error' : 'Request rejected';
  const errorCode = typeof err?.code === 'string' ? err.code : err?.name || 'GatewayError';

  console.error(`[Gateway Error] [${requestId}] ${req.method} ${req.path} -> ${statusCode}:${errorCode}`);

  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      message,
      requestId: requestId || undefined
    });
  }
}
