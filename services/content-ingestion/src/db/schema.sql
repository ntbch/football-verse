-- Ingestion Spool Schema for Content Ingestion Service
CREATE TABLE IF NOT EXISTS ingestion_spool (
  id BIGSERIAL PRIMARY KEY,
  item_key VARCHAR(64) UNIQUE NOT NULL,
  source_id BIGINT NOT NULL,
  source_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, ACCEPTED, SKIPPED, FAILED
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  accepted_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ingestion_spool ADD COLUMN IF NOT EXISTS accepted_result JSONB;

CREATE INDEX IF NOT EXISTS idx_ingestion_spool_state_next ON ingestion_spool(state, next_attempt_at);

CREATE TABLE IF NOT EXISTS source_checkpoints (
  source_id BIGINT PRIMARY KEY,
  etag TEXT,
  last_modified TEXT,
  cursor_value TEXT,
  config_revision INT,
  last_success_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_leases (
  source_id BIGINT PRIMARY KEY,
  lease_owner VARCHAR(128) NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_leases_expires
  ON source_leases(lease_expires_at);

CREATE TABLE IF NOT EXISTS source_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL,
  mode VARCHAR(32) NOT NULL,
  outcome VARCHAR(16) NOT NULL,
  seen_count INT NOT NULL DEFAULT 0,
  collected_count INT NOT NULL DEFAULT 0,
  enqueued_count INT NOT NULL DEFAULT 0,
  skipped_missing_title_count INT NOT NULL DEFAULT 0,
  missing_media_count INT NOT NULL DEFAULT 0,
  invalid_media_count INT NOT NULL DEFAULT 0,
  duplicate_identity_count INT NOT NULL DEFAULT 0,
  failure_code VARCHAR(160),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_sync_runs_source_finished
  ON source_sync_runs(source_id, finished_at DESC);
