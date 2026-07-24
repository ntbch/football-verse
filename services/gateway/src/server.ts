import express from 'express';
import { createServer } from 'http';
import { getConfig, validateSecurityEnvironment } from './config';
import { requestIdMiddleware, cachePrivacyMiddleware, corsMiddleware } from './middleware/security';
import { metricsMiddleware } from './middleware/metrics';
import { safeErrorHandler } from './middleware/error-handler';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { healthRouter } from './routes/health-routes';
import { setupProxy } from './proxy';
import { setupSocket } from './socket';

validateSecurityEnvironment();

const config = getConfig();
const app = express();
const server = createServer(app);

// 1. Request ID, Metrics, CORS, Cache Privacy
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(cachePrivacyMiddleware);
app.use(corsMiddleware);
app.use(createRateLimitMiddleware({ limit: config.rateLimit, windowMs: config.rateLimitWindowMs }));

// 2. Health & Control Routes
app.use(healthRouter);

// 3. API Gateway Proxy Routing
setupProxy(app);

// 4. WebSockets & Redis Listener
setupSocket(server);

// 5. Safe Error Handler Middleware
app.use(safeErrorHandler);

server.listen(config.port, () => {
  console.log(`Realtime Gateway listening on port ${config.port} (${config.appEnv})`);
});
