import { Request, Response, NextFunction } from 'express';

interface RouteMetrics {
  requests: number;
  errors: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

const metricsStore: Record<string, RouteMetrics> = {
  game: { requests: 0, errors: 0, totalDurationMs: 0, avgDurationMs: 0 },
  core: { requests: 0, errors: 0, totalDurationMs: 0, avgDurationMs: 0 },
  prediction: { requests: 0, errors: 0, totalDurationMs: 0, avgDurationMs: 0 },
  other: { requests: 0, errors: 0, totalDurationMs: 0, avgDurationMs: 0 },
};

function resolveRouteGroup(path: string): string {
  if (path.startsWith('/api/v1/game') || path.startsWith('/game')) return 'game';
  if (path.startsWith('/api/v1')) return 'core';
  if (path.startsWith('/matches') || path.startsWith('/standings')) return 'prediction';
  return 'other';
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const group = resolveRouteGroup(req.path);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const stats = metricsStore[group] || metricsStore.other;

    stats.requests++;
    if (res.statusCode >= 400) {
      stats.errors++;
    }
    stats.totalDurationMs += duration;
    stats.avgDurationMs = Math.round(stats.totalDurationMs / stats.requests);
  });

  next();
}

export function getMetricsSummary(): Record<string, RouteMetrics> {
  return JSON.parse(JSON.stringify(metricsStore));
}
