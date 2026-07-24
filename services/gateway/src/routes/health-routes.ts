import { Router } from 'express';
import { getMetricsSummary } from '../middleware/metrics';
import { safeTokenEquals, getConfig } from '../config';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'realtime-gateway',
    uptime: Math.floor(process.uptime()),
    metrics: getMetricsSummary()
  });
});

healthRouter.post('/crawl', (req, res) => {
  const { internalToken, contentIngestionUrl } = getConfig();
  const token = req.headers['x-internal-token'];

  if (typeof token !== 'string' || !safeTokenEquals(internalToken, token)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  fetch(`${contentIngestionUrl}/crawl`, {
    method: 'POST',
    headers: { 'X-Internal-Token': token }
  }).catch(err => console.error('[Gateway] Failed to trigger crawl on content-ingestion:', err.message));

  res.json({ success: true, message: 'Crawl cycle triggered' });
});
