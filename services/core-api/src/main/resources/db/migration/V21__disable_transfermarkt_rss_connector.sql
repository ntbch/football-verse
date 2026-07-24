-- Transfermarkt currently rejects the configured RSS endpoint with HTTP 405.
-- Retain the connector and any evidence, but prevent repeated no-crawl sync failures.
UPDATE news_sources
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Transfermarkt'
  AND provider = 'rss'
  AND active = TRUE;
