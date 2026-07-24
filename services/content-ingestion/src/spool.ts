import { pool } from './db/pool';
import { URL } from 'url';
import crypto from 'crypto';
import { assertSafeHttpUrl } from './crawler/secure-fetch';
import { CollectionStats, NormalizedItemV1, ProviderCheckpoint } from './contracts/normalized-item';

export const MAX_SPOOL_ATTEMPTS = 8;

export interface SourceSyncRun {
  sourceId: number;
  mode: string;
  outcome: 'SUCCEEDED' | 'FAILED';
  stats?: CollectionStats;
  collectedCount?: number;
  enqueuedCount?: number;
  failureCode?: string;
  startedAt: Date;
}

export interface SpoolItem {
  id: number;
  itemKey: string;
  sourceId: number;
  sourceUrl: string;
  payload: any;
  state: 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'SKIPPED' | 'FAILED';
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  acceptedResult?: unknown;
}

export function normalizeSourceUrl(sourceUrl: string): string {
  const parsed = new URL(sourceUrl.trim());
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }
  const sorted = [...parsed.searchParams.entries()]
    .filter(([key]) => !key.toLowerCase().startsWith('utm_'))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  parsed.search = '';
  sorted.forEach(([key, value]) => parsed.searchParams.append(key, value));
  return parsed.toString();
}

export function computeItemKey(sourceUrl: string, payload?: unknown): string {
  if (payload && typeof payload === 'object' && 'idempotencyKey' in payload) {
    const idempotencyKey = String((payload as { idempotencyKey?: unknown }).idempotencyKey ?? '');
    if (/^[a-f0-9]{64}$/i.test(idempotencyKey)) return idempotencyKey.toLowerCase();
  }
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  const content = payload && typeof payload === 'object' && 'content' in payload
    ? String((payload as { content?: unknown }).content ?? '').trim().replace(/\s+/g, ' ')
    : '';
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  return crypto.createHash('sha256').update(`${normalizedUrl}\n${contentHash}`).digest('hex');
}

export async function getSourceCheckpoint(sourceId: number): Promise<ProviderCheckpoint | undefined> {
  const result = await pool.query(
    `SELECT etag, last_modified AS "lastModified", cursor_value AS cursor,
            config_revision AS "configRevision"
     FROM source_checkpoints
     WHERE source_id = $1`,
    [sourceId],
  );
  return result.rows[0];
}

export async function saveSourceCheckpoint(
  sourceId: number,
  checkpoint: ProviderCheckpoint,
): Promise<void> {
  await pool.query(
    `INSERT INTO source_checkpoints
       (source_id, etag, last_modified, cursor_value, config_revision, last_success_at, next_attempt_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT (source_id) DO UPDATE SET
       etag = EXCLUDED.etag,
       last_modified = EXCLUDED.last_modified,
       cursor_value = EXCLUDED.cursor_value,
       config_revision = EXCLUDED.config_revision,
       last_success_at = CURRENT_TIMESTAMP,
       next_attempt_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [
      sourceId,
      checkpoint.etag ?? null,
      checkpoint.lastModified ?? null,
      checkpoint.cursor ?? null,
      checkpoint.configRevision ?? null,
    ],
  );
}

export async function getSourceRetryAfter(sourceId: number): Promise<Date | undefined> {
  const result = await pool.query(
    `SELECT next_attempt_at AS "nextAttemptAt"
     FROM source_checkpoints
     WHERE source_id = $1 AND next_attempt_at > CURRENT_TIMESTAMP`,
    [sourceId],
  );
  return result.rows[0]?.nextAttemptAt;
}

export async function deferSourceUntil(sourceId: number, retryAfterMs: number): Promise<void> {
  const delayMs = Math.min(Math.max(Math.floor(retryAfterMs), 1_000), 24 * 60 * 60 * 1_000);
  await pool.query(
    `INSERT INTO source_checkpoints (source_id, next_attempt_at, updated_at)
     VALUES ($1, CURRENT_TIMESTAMP + ($2 * INTERVAL '1 millisecond'), CURRENT_TIMESTAMP)
     ON CONFLICT (source_id) DO UPDATE SET
       next_attempt_at = GREATEST(COALESCE(source_checkpoints.next_attempt_at, '-infinity'::timestamptz), EXCLUDED.next_attempt_at),
       updated_at = CURRENT_TIMESTAMP`,
    [sourceId, delayMs],
  );
}

export async function tryAcquireSourceLease(
  sourceId: number,
  owner: string,
  leaseMs = 120_000,
): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO source_leases (source_id, lease_owner, lease_expires_at, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 millisecond'), CURRENT_TIMESTAMP)
     ON CONFLICT (source_id) DO UPDATE SET
       lease_owner = EXCLUDED.lease_owner,
       lease_expires_at = EXCLUDED.lease_expires_at,
       updated_at = CURRENT_TIMESTAMP
     WHERE source_leases.lease_expires_at < CURRENT_TIMESTAMP
        OR source_leases.lease_owner = EXCLUDED.lease_owner
     RETURNING source_id`,
    [sourceId, owner, leaseMs],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function releaseSourceLease(sourceId: number, owner: string): Promise<void> {
  await pool.query(
    `DELETE FROM source_leases WHERE source_id = $1 AND lease_owner = $2`,
    [sourceId, owner],
  );
}

export async function recordSourceSyncRun(run: SourceSyncRun): Promise<void> {
  const stats = run.stats ?? {
    seenCount: 0,
    skippedMissingTitleCount: 0,
    missingMediaCount: 0,
    invalidMediaCount: 0,
    duplicateIdentityCount: 0,
  };
  await pool.query(
    `INSERT INTO source_sync_runs (
       source_id, mode, outcome, seen_count, collected_count, enqueued_count,
       skipped_missing_title_count, missing_media_count, invalid_media_count,
       duplicate_identity_count, failure_code, started_at, finished_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
    [
      run.sourceId,
      run.mode,
      run.outcome,
      stats.seenCount,
      run.collectedCount ?? 0,
      run.enqueuedCount ?? 0,
      stats.skippedMissingTitleCount,
      stats.missingMediaCount,
      stats.invalidMediaCount,
      stats.duplicateIdentityCount,
      run.failureCode?.slice(0, 160) ?? null,
      run.startedAt,
    ],
  );
}

export interface SourceReadiness {
  sourceId: number;
  mode: string;
  outcome: 'SUCCEEDED' | 'FAILED';
  seenCount: number;
  collectedCount: number;
  enqueuedCount: number;
  skippedMissingTitleCount: number;
  missingMediaCount: number;
  invalidMediaCount: number;
  duplicateIdentityCount: number;
  failureCode?: string;
  retryAfterAt?: string;
  finishedAt: string;
}

export async function latestSourceReadiness(): Promise<SourceReadiness[]> {
  const result = await pool.query(
    `SELECT DISTINCT ON (run.source_id)
       run.source_id AS "sourceId", mode, outcome,
       seen_count AS "seenCount", collected_count AS "collectedCount",
       enqueued_count AS "enqueuedCount",
       skipped_missing_title_count AS "skippedMissingTitleCount",
       missing_media_count AS "missingMediaCount",
       invalid_media_count AS "invalidMediaCount",
       duplicate_identity_count AS "duplicateIdentityCount",
       failure_code AS "failureCode", checkpoint.next_attempt_at AS "retryAfterAt",
       finished_at AS "finishedAt"
     FROM source_sync_runs run
     LEFT JOIN source_checkpoints checkpoint ON checkpoint.source_id = run.source_id
     ORDER BY run.source_id, run.finished_at DESC`,
  );
  return result.rows;
}

export async function enqueueNormalizedBatch(
  sourceId: number,
  items: NormalizedItemV1[],
  checkpoint: ProviderCheckpoint,
): Promise<number> {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const item of items) {
      if (item.connectorId !== sourceId || !isValidIngestionUrl(item.originalUrl)) continue;
      const normalizedUrl = normalizeSourceUrl(item.originalUrl);
      const result = await client.query(
        `INSERT INTO ingestion_spool
           (item_key, source_id, source_url, payload, state, attempts, next_attempt_at, updated_at)
         VALUES ($1, $2, $3, $4, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (item_key) DO NOTHING
         RETURNING id`,
        [item.idempotencyKey, sourceId, normalizedUrl, JSON.stringify(item)],
      );
      inserted += result.rowCount ?? 0;
    }

    await client.query(
      `INSERT INTO source_checkpoints
         (source_id, etag, last_modified, cursor_value, config_revision, last_success_at, next_attempt_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT (source_id) DO UPDATE SET
         etag = EXCLUDED.etag,
         last_modified = EXCLUDED.last_modified,
         cursor_value = EXCLUDED.cursor_value,
         config_revision = EXCLUDED.config_revision,
         last_success_at = CURRENT_TIMESTAMP,
         next_attempt_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [
        sourceId,
        checkpoint.etag ?? null,
        checkpoint.lastModified ?? null,
        checkpoint.cursor ?? null,
        checkpoint.configRevision ?? null,
      ],
    );
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function calculateBackoffMs(attempts: number): number {
  // Bounded exponential backoff: 30s, 2m, 8m, 32m, capped at 1 hour (3600000 ms)
  const baseMs = 30000;
  const backoff = baseMs * Math.pow(4, attempts);
  return Math.min(backoff, 3600000);
}

export function isValidIngestionUrl(urlStr: string): boolean {
  try {
    assertSafeHttpUrl(urlStr);
    return true;
  } catch {
    return false;
  }
}

export async function enqueueSpoolItem(
  sourceId: number,
  sourceUrl: string,
  payload: any
): Promise<boolean> {
  if (!isValidIngestionUrl(sourceUrl)) {
    console.warn(`[Spool] Invalid or SSRF-risky URL rejected: ${sourceUrl}`);
    return false;
  }

  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  const itemKey = computeItemKey(normalizedUrl, payload);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO ingestion_spool (item_key, source_id, source_url, payload, state, attempts, next_attempt_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (item_key) DO NOTHING
       RETURNING id;`,
      [itemKey, sourceId, normalizedUrl, JSON.stringify(payload)]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function fetchPendingSpoolItems(limit = 10): Promise<SpoolItem[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `WITH candidates AS (
         SELECT id
         FROM ingestion_spool
         WHERE (state = 'PENDING' AND next_attempt_at <= CURRENT_TIMESTAMP)
            OR (state = 'PROCESSING' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
         ORDER BY next_attempt_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE ingestion_spool spool
       SET state = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
       FROM candidates
       WHERE spool.id = candidates.id
       RETURNING spool.id, spool.item_key as "itemKey", spool.source_id as "sourceId",
                 spool.source_url as "sourceUrl", spool.payload, spool.state, spool.attempts,
                 spool.next_attempt_at as "nextAttemptAt", spool.last_error as "lastError",
                 spool.accepted_result as "acceptedResult";`,
      [limit]
    );
    return res.rows.map(row => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    }));
  } finally {
    client.release();
  }
}

export async function updateSpoolItemSuccess(
  id: number,
  state: 'ACCEPTED' | 'SKIPPED',
  acceptedResult: unknown,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ingestion_spool
       SET state = $1, accepted_result = $2, last_error = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3;`,
      [state, JSON.stringify(acceptedResult), id]
    );
  } finally {
    client.release();
  }
}

export async function updateSpoolItemFailure(id: number, attempts: number, errorMsg: string): Promise<void> {
  const nextAttempts = attempts + 1;
  const backoffMs = calculateBackoffMs(nextAttempts);
  const nextAttemptAt = new Date(Date.now() + backoffMs);

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ingestion_spool
       SET attempts = $1, state = $2, next_attempt_at = $3, last_error = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5;`,
      [nextAttempts, nextAttempts >= MAX_SPOOL_ATTEMPTS ? 'FAILED' : 'PENDING',
        nextAttemptAt, errorMsg.substring(0, 1000), id]
    );
  } finally {
    client.release();
  }
}

export async function replayFailedSpoolItems(limit = 100): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `WITH failed AS (
         SELECT id FROM ingestion_spool
         WHERE state = 'FAILED'
         ORDER BY updated_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE ingestion_spool spool
       SET state = 'PENDING', attempts = 0, next_attempt_at = CURRENT_TIMESTAMP,
           last_error = NULL, updated_at = CURRENT_TIMESTAMP
       FROM failed
       WHERE spool.id = failed.id;`,
      [limit],
    );
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
}
