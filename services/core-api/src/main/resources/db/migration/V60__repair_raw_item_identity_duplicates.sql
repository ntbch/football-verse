-- Repair legacy raw-item duplicates without deleting their evidence.
-- Keep the most complete/latest row for the source identity and namespace older
-- rows so future imports can safely resolve against the canonical row.
-- The existing indexes are stale for these legacy rows, so rebuild them around
-- the repair instead of relying on their incomplete index entries.
ALTER TABLE raw_items DROP CONSTRAINT IF EXISTS raw_items_identity_key_key;
DROP INDEX IF EXISTS uq_raw_items_provider_external;

WITH ranked AS (
    SELECT
        id,
        identity_key,
        ROW_NUMBER() OVER (
            PARTITION BY identity_key
            ORDER BY
                (external_id IS NOT NULL) DESC,
                (canonical_url IS NOT NULL) DESC,
                updated_at DESC,
                id DESC
        ) AS row_number
    FROM raw_items
)
UPDATE raw_items item
SET identity_key = CONCAT('legacy:duplicate:', item.id, ':', item.identity_key)
FROM ranked duplicate
WHERE duplicate.id = item.id
  AND duplicate.row_number > 1;

-- Keep uq_raw_items_provider_external valid for the same legacy races.
WITH ranked AS (
    SELECT
        id,
        connector_id,
        provider,
        external_id,
        ROW_NUMBER() OVER (
            PARTITION BY connector_id, provider, external_id
            ORDER BY
                (identity_key NOT LIKE 'legacy:duplicate:%') DESC,
                updated_at DESC,
                id DESC
        ) AS row_number
    FROM raw_items
    WHERE external_id IS NOT NULL
)
UPDATE raw_items item
SET external_id = CONCAT('legacy:', item.connector_id, ':', item.id, ':', item.external_id)
FROM ranked duplicate
WHERE duplicate.id = item.id
  AND duplicate.row_number > 1;

-- Rebuild the indexes after repairing rows that predate the current import path.
ALTER TABLE raw_items
    ADD CONSTRAINT raw_items_identity_key_key UNIQUE (identity_key);
CREATE UNIQUE INDEX uq_raw_items_provider_external
    ON raw_items (connector_id, provider, external_id)
    WHERE external_id IS NOT NULL;
