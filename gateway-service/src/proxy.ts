import { createProxyMiddleware } from 'http-proxy-middleware';
import { Express } from 'express';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
const predictionServiceUrl = process.env.PREDICTION_SERVICE_URL || 'http://localhost:8090';

export const setupProxy = (app: Express): void => {
  // Route /api/v1/* to Spring Boot Core
  app.use(
    '/api/v1',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/api/v1${path}`,
    })
  );

  // Route /matches/* to Python Prediction Service
  app.use(
    '/matches',
    createProxyMiddleware({
      target: predictionServiceUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/matches${path}`,
    })
  );

  // Route /standings/* to Python Prediction Service
  app.use(
    '/standings',
    createProxyMiddleware({
      target: predictionServiceUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/standings${path}`,
    })
  );

  // Route /game/* to Python Prediction Service
  app.use(
    '/game',
    createProxyMiddleware({
      target: predictionServiceUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/game${path}`,
    })
  );
};
