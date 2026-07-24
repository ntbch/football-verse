import cron from 'node-cron';
import { randomUUID } from 'node:crypto';
import { getGotScraping } from './crawler/got-helper';
import { extractLinks } from './crawler/link-extractor';
import { scrapeArticle } from './crawler/html-scraper';
import { initDbSchema } from './db/pool';
import { adapterFor } from './adapters/registry';
import { CollectionStats, SourceDescriptor } from './contracts/normalized-item';
import { startControlServer, ControlState } from './control-server';
import {
  enqueueSpoolItem,
  enqueueNormalizedBatch,
  deferSourceUntil,
  fetchPendingSpoolItems,
  getSourceCheckpoint,
  getSourceRetryAfter,
  latestSourceReadiness,
  recordSourceSyncRun,
  releaseSourceLease,
  saveSourceCheckpoint,
  tryAcquireSourceLease,
  updateSpoolItemSuccess,
  updateSpoolItemFailure,
  isValidIngestionUrl
} from './spool';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;
const CRAWL_CRON = process.env.CRAWL_CRON || '*/15 * * * *';
const INGESTION_MODE = process.env.INGESTION_MODE || 'rss_metadata_shadow';
const WORKER_INSTANCE_ID = process.env.WORKER_INSTANCE_ID || randomUUID();

const feedCache = new Map<string, { etag?: string; lastModified?: string }>();
let cycleRunning = false;
const controlState: ControlState = { running: false };

function internalToken(): string {
  if (!INTERNAL_TOKEN || INTERNAL_TOKEN.length < 16) {
    throw new Error('INTERNAL_TOKEN must be configured with at least 16 characters');
  }
  return INTERNAL_TOKEN;
}

type NewsSourceResponse = SourceDescriptor;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ImportResponseData {
  status: 'ACCEPTED' | 'UPDATED' | 'EXISTS' | 'REJECTED';
  message: string;
}

export async function processSpoolQueue(): Promise<void> {
  const pendingItems = await fetchPendingSpoolItems(100);
  if (pendingItems.length === 0) return;

  console.log(`[Worker] Processing ${pendingItems.length} pending spool items...`);
  const gotScraping = await getGotScraping();

  for (const item of pendingItems) {
    try {
      if (!isValidIngestionUrl(item.sourceUrl)) {
        await updateSpoolItemSuccess(item.id, 'SKIPPED', { status: 'REJECTED', message: 'Unsafe source URL' });
        continue;
      }

      const normalizedItem = item.payload?.schemaVersion === 1;
      const response = await gotScraping({
        url: `${BACKEND_URL}/api/v1/internal/news/${normalizedItem ? 'raw-items' : 'import'}`,
        method: 'POST',
        headers: {
          'X-Internal-Token': internalToken(),
          'Content-Type': 'application/json'
        },
        json: item.payload,
        responseType: 'json',
        timeout: { request: 10000 }
      });

      const apiResult = response.body as ApiResponse<ImportResponseData | string>;
      let statusString = 'ACCEPTED';

      if (typeof apiResult.data === 'object' && apiResult.data !== null && 'status' in apiResult.data) {
        statusString = apiResult.data.status;
      } else if (apiResult.message && apiResult.message.includes('skipped')) {
        statusString = 'EXISTS';
      }

      if (statusString === 'ACCEPTED' || statusString === 'UPDATED') {
        console.log(`[Worker] Spool item #${item.id} ${statusString} by Core API`);
        await updateSpoolItemSuccess(item.id, 'ACCEPTED', apiResult.data);
      } else {
        console.log(`[Worker] Spool item #${item.id} ${statusString}: ${apiResult.message}`);
        await updateSpoolItemSuccess(item.id, 'SKIPPED', apiResult.data);
      }
    } catch (err: any) {
      const safeError = String(err?.code ?? err?.message ?? 'IMPORT_FAILED').replace(/https?:\/\/\S+/gi, '[url]').slice(0, 200);
      console.error(`[Worker] Spool item #${item.id} import failed: ${safeError}`);
      await updateSpoolItemFailure(item.id, item.attempts, safeError);
    }
  }
}

async function fetchSources(): Promise<NewsSourceResponse[]> {
  const gotScraping = await getGotScraping();
  const sourcesResponse = await gotScraping({
    url: `${BACKEND_URL}/api/v1/internal/news-sources`,
    headers: { 'X-Internal-Token': internalToken() },
    responseType: 'json',
  });
  const apiResult = sourcesResponse.body as ApiResponse<NewsSourceResponse[]>;
  if (!apiResult.success || !apiResult.data) {
    throw new Error(apiResult.message || 'SOURCE_LIST_FAILED');
  }
  return apiResult.data;
}

async function runLegacySource(source: NewsSourceResponse): Promise<number> {
  const links = await extractLinks(source, 10, feedCache);
  let enqueued = 0;
  for (const item of links) {
    if (!isValidIngestionUrl(item.link)) continue;
    const scraped = await scrapeArticle(
      item.link,
      source.sourceType === 'HOMEPAGE' ? undefined : source.cssSelector,
    );
    if (!scraped) continue;

    const rawTitle = item.title || scraped.title;
    const title = rawTitle && rawTitle.length > 200
      ? `${rawTitle.substring(0, 197)}...`
      : rawTitle;
    const summary = item.description || scraped.summary;
    const content = scraped.content;
    const publishedAt = item.pubDate || scraped.publishedAt || new Date().toISOString();
    if (!title || !content) continue;

    const accepted = await enqueueSpoolItem(source.id, item.link, {
      title,
      sourceUrl: item.link,
      sourceId: source.id,
      summary,
      content,
      publishedAt,
      imageUrl: scraped.imageUrl,
    });
    if (accepted) enqueued += 1;
  }
  return enqueued;
}

async function runMetadataSource(source: NewsSourceResponse, shadow: boolean): Promise<{
  collected: number;
  enqueued: number;
  stats: CollectionStats;
}> {
  const adapter = adapterFor(source);
  if (!adapter) {
    console.warn(`[Worker] No metadata adapter for source #${source.id} (${source.sourceType})`);
    return {
      collected: 0,
      enqueued: 0,
      stats: {
        seenCount: 0,
        skippedMissingTitleCount: 0,
        missingMediaCount: 0,
        invalidMediaCount: 0,
        duplicateIdentityCount: 0,
      },
    };
  }
  const checkpoint = await getSourceCheckpoint(source.id);
  const result = await adapter.collect(source, checkpoint, 30);
  if (shadow) {
    await saveSourceCheckpoint(source.id, result.checkpoint);
    console.log(`[Worker] Shadow collected ${result.items.length} item(s) from source #${source.id}`);
    return { collected: result.items.length, enqueued: 0, stats: result.stats };
  }
  const enqueued = await enqueueNormalizedBatch(source.id, result.items, result.checkpoint);
  return { collected: result.items.length, enqueued, stats: result.stats };
}

export async function runCrawlCycle(): Promise<void> {
  if (cycleRunning || INGESTION_MODE === 'off') return;
  cycleRunning = true;
  controlState.running = true;
  controlState.lastStartedAt = new Date().toISOString();
  controlState.lastError = undefined;
  console.log(`[Worker] Starting synchronization cycle in ${INGESTION_MODE} mode...`);
  try {
    const sources = await fetchSources();
    console.log(`[Worker] Found ${sources.length} active news sources.`);
    let collected = 0;
    let enqueued = 0;
    let failed = 0;
    for (const source of sources) {
      const startedAt = new Date();
      let leaseAcquired = false;
      try {
        leaseAcquired = await tryAcquireSourceLease(source.id, WORKER_INSTANCE_ID);
        if (!leaseAcquired) {
          console.log(`[Worker] Source #${source.id} is leased by another worker; skipping.`);
          continue;
        }
        const retryAfter = await getSourceRetryAfter(source.id);
        if (retryAfter) {
          console.log(`[Worker] Source #${source.id} is deferred until ${retryAfter.toISOString()}.`);
          continue;
        }
        if (INGESTION_MODE === 'legacy') {
          const legacyEnqueued = await runLegacySource(source);
          enqueued += legacyEnqueued;
          await recordSourceSyncRun({
            sourceId: source.id,
            mode: INGESTION_MODE,
            outcome: 'SUCCEEDED',
            collectedCount: legacyEnqueued,
            enqueuedCount: legacyEnqueued,
            startedAt,
          });
        } else {
          const outcome = await runMetadataSource(
            source,
            INGESTION_MODE === 'rss_metadata_shadow',
          );
          collected += outcome.collected;
          enqueued += outcome.enqueued;
          await recordSourceSyncRun({
            sourceId: source.id,
            mode: INGESTION_MODE,
            outcome: 'SUCCEEDED',
            stats: outcome.stats,
            collectedCount: outcome.collected,
            enqueuedCount: outcome.enqueued,
            startedAt,
          });
        }
      } catch (error: any) {
        failed += 1;
        const failure = error?.code ?? error?.message ?? error?.name ?? 'SOURCE_SYNC_FAILED';
        const safeError = String(failure).replace(/https?:\/\/\S+/gi, '[url]').slice(0, 160);
        console.error(`[Worker] Source #${source.id} failed: ${safeError}`);
        if (Number.isFinite(error?.retryAfterMs) && error.retryAfterMs > 0) {
          await deferSourceUntil(source.id, error.retryAfterMs);
        }
        try {
          await recordSourceSyncRun({
            sourceId: source.id,
            mode: INGESTION_MODE,
            outcome: 'FAILED',
            failureCode: safeError,
            startedAt,
          });
        } catch (telemetryError: any) {
          console.error(`[Worker] Failed to record source #${source.id} readiness: ${telemetryError?.message || 'UNKNOWN'}`);
        }
      } finally {
        if (leaseAcquired) {
          try {
            await releaseSourceLease(source.id, WORKER_INSTANCE_ID);
          } catch (leaseError: any) {
            console.error(`[Worker] Failed to release source #${source.id} lease: ${leaseError?.message || 'UNKNOWN'}`);
          }
        }
      }
    }
    console.log(`[Worker] Cycle complete: collected=${collected}, enqueued=${enqueued}, failedSources=${failed}`);
  } catch (err: any) {
    controlState.lastError = String(err?.message || 'SYNC_FAILED').slice(0, 200);
    console.error('[Worker] Error in synchronization cycle:', controlState.lastError);
  } finally {
    cycleRunning = false;
    controlState.running = false;
    controlState.lastFinishedAt = new Date().toISOString();
  }
}

function triggerCrawlCycle(): boolean {
  if (cycleRunning || INGESTION_MODE === 'off') return false;
  runCrawlCycle().catch(error => {
    console.error('[Worker] Manual cycle failed:', error?.message || error);
  });
  return true;
}

async function startWorker() {
  console.log('[Worker] Initializing Content Ingestion Worker...');
  const token = internalToken();
  await initDbSchema();
  startControlServer(
    token,
    triggerCrawlCycle,
    () => ({ ...controlState }),
    latestSourceReadiness,
  );

  // Run spool processor queue loop every 1 second
  setInterval(() => {
    processSpoolQueue().catch(err => console.error('[Worker] Error in spool loop:', err));
  }, 1000);

  // Schedule cron crawl cycle
  cron.schedule(CRAWL_CRON, () => {
    triggerCrawlCycle();
  });

  if (process.env.RUN_CRAWL_ON_STARTUP === 'true') {
    triggerCrawlCycle();
  }
}

if (require.main === module) {
  startWorker().catch(err => {
    console.error('[Worker] Fatal startup error:', err);
    process.exit(1);
  });
}
