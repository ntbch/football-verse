import express from 'express';
import { createServer } from 'http';
import { setupProxy } from './proxy';
import { setupSocket } from './socket';
import { startCrawlerWorker, triggerCrawlManually } from './crawler';

const app = express();
const server = createServer(app);

const port = process.env.PORT || 8000;

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
