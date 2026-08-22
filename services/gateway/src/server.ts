import express from 'express';
import { createServer } from 'http';
import { getConfig, validateSecurityEnvironment } from './config';
import { requestIdMiddleware, cachePrivacyMiddleware, browserSecurityHeaders, corsMiddleware } from './middleware/security';
import { metricsMiddleware } from './middleware/metrics';
import { safeErrorHandler } from './middleware/error-handler';
import { createRateLimitMiddleware, RedisRateLimitStore } from './middleware/rate-limit';
import { createHealthRouter } from './routes/health-routes';
import { logInfo } from './logger';
import { setupProxy } from './proxy';
import { setupSocket } from './socket';

validateSecurityEnvironment();

const config = getConfig();
const app = express();
const server = createServer(app);

app.set('trust proxy', config.trustProxyHops);
const rateLimitStore = config.rateLimitStore === 'redis'
  ? new RedisRateLimitStore(config.redisUrl)
  : undefined;

// 1. Request ID, Metrics, CORS, Cache Privacy
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(cachePrivacyMiddleware);
app.use(browserSecurityHeaders);
app.use(corsMiddleware);
app.use(createRateLimitMiddleware({ limit: config.rateLimit, windowMs: config.rateLimitWindowMs, billingIpnLimit: config.billingIpnRateLimit, authLimit: config.authRateLimit, store: rateLimitStore }));

// 2. Health & Control Routes
app.use(createHealthRouter(async () => rateLimitStore ? rateLimitStore.isReady() : true));

// 3. API Gateway Proxy Routing
setupProxy(app);

// 4. WebSockets & Redis Listener
setupSocket(server);

// 5. Safe Error Handler Middleware
app.use(safeErrorHandler);

server.listen(config.port, () => {
  logInfo(`Realtime Gateway listening on port ${config.port} (${config.appEnv})`);
});

const shutdown = (): void => {
  void (rateLimitStore ? rateLimitStore.close() : Promise.resolve())
    .finally(() => server.close(() => process.exit(0)));
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
