import { safeTokenEquals, validateSecurityEnvironment } from './security-config';

export interface GatewayConfig {
  port: number;
  corsOrigin: string;
  backendUrl: string;
  predictionServiceUrl: string;
  contentIngestionUrl: string;
  internalToken: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  appEnv: string;
  rateLimit: number;
  rateLimitWindowMs: number;
  billingIpnRateLimit: number;
  rateLimitStore: 'memory' | 'redis';
  redisUrl: string;
  trustProxyHops: number;
}

function nonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getConfig(): GatewayConfig {
  return {
    port: parseInt(process.env.PORT || '8000', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8080',
    predictionServiceUrl: process.env.PREDICTION_SERVICE_URL || 'http://localhost:8090',
    contentIngestionUrl: process.env.CONTENT_INGESTION_URL || 'http://content-ingestion:8085',
    internalToken: process.env.INTERNAL_TOKEN || 'dev-internal-token-change-me-in-production',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-dev-secret-change-me',
    jwtIssuer: process.env.JWT_ISSUER || 'football-verse-core',
    jwtAudience: process.env.JWT_AUDIENCE || 'football-verse-api',
    appEnv: (process.env.APP_ENV || 'development').toLowerCase(),
    rateLimit: Math.max(parseInt(process.env.RATE_LIMIT_MAX || '300', 10), 1),
    rateLimitWindowMs: Math.max(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), 1000),
    billingIpnRateLimit: Math.max(parseInt(process.env.BILLING_IPN_RATE_LIMIT_MAX || '60', 10), 1),
    rateLimitStore: process.env.RATE_LIMIT_STORE === 'redis' ? 'redis' : 'memory',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    trustProxyHops: nonNegativeInteger(process.env.TRUST_PROXY_HOPS, 0),
  };
}

export { safeTokenEquals, validateSecurityEnvironment };
