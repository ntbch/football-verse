import express from 'express';
import { createServer } from 'http';
import { setupProxy } from './proxy';
import { setupSocket } from './socket';
import { startCronScheduler, runCrawlCycle } from './crawler/cron-scheduler';

const app = express();
const server = createServer(app);

const port = process.env.PORT || 8000;

// Setup API Gateway Routing
setupProxy(app);

// Setup WebSockets & Redis Listener
setupSocket(server);

// Start News Crawler Scheduler
startCronScheduler();

// Local health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'realtime-gateway' });
});

// Manual crawl trigger from Admin dashboard
app.post('/crawl', (req, res) => {
  const token = req.headers['x-internal-token'];
  const expectedToken = process.env.INTERNAL_TOKEN || 'dev-internal-token';
  if (token !== expectedToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Trigger crawl asynchronously
  runCrawlCycle().catch(err => console.error('[Crawler] Manual crawl execution failed:', err));
  res.json({ success: true, message: 'Crawl cycle triggered' });
});

server.listen(port, () => {
  console.log(`Realtime Gateway listening on port ${port}`);
});
