import cron from 'node-cron';
import { getGotScraping } from './got-helper';
import { extractLinks } from './link-extractor';
import { scrapeArticle } from './html-scraper';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';
const CRAWL_CRON = process.env.CRAWL_CRON || '*/15 * * * *';

const feedCache = new Map<string, { etag?: string; lastModified?: string }>();

interface NewsSourceResponse {
  id: number;
  name: string;
  feedUrl: string;
  active: boolean;
  sourceType: 'RSS' | 'SITEMAP' | 'HOMEPAGE';
  cssSelector?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function runCrawlCycle() {
  console.log('[Crawler] Starting crawl cycle...');
  try {
    const gotScraping = await getGotScraping();
    // 1. Fetch sources from Spring Boot
    const sourcesResponse = await gotScraping({
      url: `${BACKEND_URL}/api/v1/internal/news-sources`,
      headers: {
        'X-Internal-Token': INTERNAL_TOKEN
      },
      responseType: 'json'
    });

    const apiResult = sourcesResponse.body as ApiResponse<NewsSourceResponse[]>;
    if (!apiResult.success || !apiResult.data) {
      console.error('[Crawler] Failed to fetch news sources:', apiResult.message);
      return;
    }

    const sources = apiResult.data;
    console.log(`[Crawler] Found ${sources.length} active news sources to crawl.`);

    for (const source of sources) {
      console.log(`[Crawler] Scraping source: ${source.name} (${source.sourceType})`);
      const links = await extractLinks(source, 10, feedCache); // Crawl up to 10 links per source per run to avoid spamming
      console.log(`[Crawler] Extracted ${links.length} links from ${source.name}`);

      for (const item of links) {
        try {
          // Check if article already exists and its health status in Spring Boot
          let shouldScrape = true;
          try {
            const checkUrl = `${BACKEND_URL}/api/v1/internal/news/check-status?url=${encodeURIComponent(item.link)}`;
            const checkRes = await gotScraping({
              url: checkUrl,
              headers: {
                'X-Internal-Token': INTERNAL_TOKEN
              },
              responseType: 'json'
            });
            const checkResult = checkRes.body as ApiResponse<{ exists: boolean; needsRepair: boolean }>;
            if (checkResult.success) {
              if (checkResult.data.exists && !checkResult.data.needsRepair) {
                console.log(`[Crawler] Skipping already crawled article: ${item.link}`);
                shouldScrape = false;
              } else if (checkResult.data.exists && checkResult.data.needsRepair) {
                console.log(`[Crawler] Article needs repair (thin content): ${item.link}`);
              }
            }
          } catch (err: any) {
            console.warn(`[Crawler] Check status failed for ${item.link}, proceeding with crawl:`, err.message || err);
          }

          if (!shouldScrape) {
            continue;
          }

          console.log(`[Crawler] Scraping article: ${item.link}`);
          const scraped = await scrapeArticle(item.link, source.cssSelector);
          if (!scraped) {
            console.warn(`[Crawler] Failed to scrape article at ${item.link}`);
            continue;
          }

          // Use RSS metadata if HTML metadata is missing
          const title = item.title || scraped.title;
          const summary = item.description || scraped.summary;
          const content = scraped.content;
          const publishedAt = item.pubDate || scraped.publishedAt || new Date().toISOString();

          if (!title || !content) {
            console.warn(`[Crawler] Skipping article ${item.link} due to missing title or content`);
            continue;
          }

          // Import into Spring Boot
          const importResponse = await gotScraping({
            url: `${BACKEND_URL}/api/v1/internal/news/import`,
            method: 'POST',
            headers: {
              'X-Internal-Token': INTERNAL_TOKEN
            },
            json: {
              title,
              sourceUrl: item.link,
              sourceId: source.id,
              summary,
              content,
              publishedAt,
              imageUrl: scraped.imageUrl
            },
            responseType: 'json'
          });

          const importResult = importResponse.body as ApiResponse<any>;
          console.log(`[Crawler] Import result for "${title}":`, importResult.message);

          // Add a short delay between articles to avoid overloading external servers and internal Spring Boot
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
          console.error(`[Crawler] Failed to process link ${item.link}:`, err.message || err);
        }
      }
    }
    console.log('[Crawler] Crawl cycle completed successfully.');
  } catch (error: any) {
    console.error('[Crawler] Error in crawl cycle:', error.message || error);
  }
}

export function startCronScheduler() {
  console.log(`[Crawler] Initializing Cron Scheduler with schedule: "${CRAWL_CRON}"`);
  cron.schedule(CRAWL_CRON, async () => {
    try {
      await runCrawlCycle();
    } catch (err) {
      console.error('[Crawler] Cron execution failed:', err);
    }
  });

  // Run a startup crawl check in dev mode or if configured
  if (process.env.RUN_CRAWL_ON_STARTUP === 'true') {
    console.log('[Crawler] RUN_CRAWL_ON_STARTUP is enabled, running initial crawl...');
    runCrawlCycle().catch(err => console.error('[Crawler] Startup crawl failed:', err));
  }
}
