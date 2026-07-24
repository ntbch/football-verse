-- Tribuna consistently rejects the metadata adapter with HTTP 403 during shadow soak.
-- Keep its historical connector/evidence intact; an administrator can re-enable it if access changes.
UPDATE news_sources
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE BTRIM(name) = 'Tribuna.com'
  AND source_type = 'RSS';
