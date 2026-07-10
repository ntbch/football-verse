import express from 'express';
import { createServer } from 'http';
import { setupProxy } from './proxy';
import { setupSocket } from './socket';
import { startCrawlerWorker, triggerCrawlManually } from './crawler';

const app = express();
const server = createServer(app);

const port = process.env.PORT || 8000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === corsOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Validate critical security environment variables
if (!process.env.INTERNAL_TOKEN || process.env.INTERNAL_TOKEN.trim() === '') {
  throw new Error('FATAL: INTERNAL_TOKEN environment variable is not configured!');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  throw new Error('FATAL: JWT_SECRET environment variable is not configured!');
}

// Setup API Gateway Routing
setupProxy(app);

// Setup WebSockets & Redis Listener
setupSocket(server);

// Start News Crawler Scheduler (checks process.env.ENABLE_CRAWLER internally)
startCrawlerWorker();

// Local health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'realtime-gateway' });
});

// Manual crawl trigger from Admin dashboard
app.post('/crawl', (req, res) => {
  const token = req.headers['x-internal-token'];
  const expectedToken = process.env.INTERNAL_TOKEN;
  if (!expectedToken || token !== expectedToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Trigger crawl asynchronously
  triggerCrawlManually().catch(err => console.error('[Crawler] Manual crawl execution failed:', err));
  res.json({ success: true, message: 'Crawl cycle triggered' });
});

server.listen(port, () => {
  console.log(`Realtime Gateway listening on port ${port}`);
});
