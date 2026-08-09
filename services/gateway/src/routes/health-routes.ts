import { Router } from 'express';
import { getMetricsSummary } from '../middleware/metrics';
import { safeTokenEquals, getConfig } from '../config';

export type GatewayReadiness = () => Promise<boolean>;

export function createHealthRouter(readiness: GatewayReadiness = async () => true): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      service: 'realtime-gateway',
      uptime: Math.floor(process.uptime()),
    });
  });

  router.get('/ready', async (_req, res) => {
    if (await readiness()) {
      return res.json({ status: 'UP', service: 'realtime-gateway' });
    }
    return res.status(503).json({ status: 'DOWN', service: 'realtime-gateway', dependency: 'rate-limit-store' });
  });

  router.get('/metrics', (req, res) => {
    const { internalToken } = getConfig();
    const token = req.headers['x-internal-token'];
    if (typeof token !== 'string' || !safeTokenEquals(internalToken, token)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.json(getMetricsSummary());
  });

  router.post('/crawl', (req, res) => {
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

  return router;
}

export const healthRouter = createHealthRouter();
