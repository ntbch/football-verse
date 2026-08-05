-- News ingestion reliability: source cadence, provenance correction and known bad feeds.

-- YouTube Data API is polled hourly; the ingestion worker enforces this using
-- source_checkpoints.last_success_at and the interval returned by Core.
UPDATE news_sources
SET fetch_interval_seconds = 3600,
    config_version = GREATEST(config_version, 2)
WHERE LOWER(provider) = 'youtube';

-- Do not keep repeatedly polling endpoints already verified as broken. These
-- can be re-enabled only after a replacement endpoint has passed a live parse check.
UPDATE news_sources
SET active = FALSE
WHERE LOWER(provider) = 'rss'
  AND LOWER(feed_url) IN (
    'https://football-italia.net/feed/',
    'https://www.football365.com/feed',
    'https://www.teamtalk.com/feed',
    'https://en.as.com/rss/football/portada.xml'
  );

-- Aggregators and social/discovery connectors are not official publishers by
-- themselves. A separately verified official publisher can still be retained
-- when it is not backed only by one of these connectors.
UPDATE publishers p
SET official = FALSE
WHERE p.id IN (
    SELECT candidate.id
    FROM publishers candidate
    WHERE LOWER(COALESCE(candidate.canonical_domain, '')) IN (
        'news.google.com',
        'www.reddit.com',
        'reddit.com',
        'x.com',
        'www.x.com',
        'twitter.com',
        'www.twitter.com'
    )
    UNION
    SELECT source.publisher_id
    FROM news_sources source
    WHERE source.publisher_id IS NOT NULL
      AND LOWER(source.provider) IN ('gnews', 'googlenews', 'reddit', 'x', 'twitter')
  );

-- Preserve historical rows while correcting records that were created by the
-- old X/Reddit -> Google News fallback. This connector is inactive for future
-- collection and exists only as an honest historical provenance target.
INSERT INTO publishers (
    created_at, updated_at, name, canonical_domain, official, trust_score, active
)
VALUES (
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News fallback (legacy)',
    'news.google.com', FALSE, 0.3000, TRUE
)
ON CONFLICT (name) DO UPDATE
SET canonical_domain = EXCLUDED.canonical_domain,
    official = FALSE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO news_sources (
    created_at, updated_at, name, feed_url, active, source_type, provider,
    auto_publish, publisher_id, config_version, fetch_interval_seconds
)
VALUES (
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News fallback (legacy)', NULL,
    FALSE, 'RSS', 'gnews-legacy', FALSE,
    (SELECT id FROM publishers WHERE name = 'Google News fallback (legacy)'),
    1, 86400
)
ON CONFLICT (name) DO UPDATE
SET active = FALSE,
    provider = 'gnews-legacy',
    publisher_id = (SELECT id FROM publishers WHERE name = 'Google News fallback (legacy)'),
    updated_at = CURRENT_TIMESTAMP;

-- The old connectors could generate the same external hash for the same
-- Google News URL. Namespace the historical value before moving all rows to
-- one legacy connector so uq_raw_items_provider_external remains valid.
UPDATE raw_items ri
SET external_id = CONCAT('legacy:', ri.connector_id, ':', ri.external_id)
WHERE LOWER(ri.provider) IN ('x', 'reddit')
  AND LOWER(ri.original_url) ~ '^https?://(www\.)?news\.google\.com/'
  AND ri.external_id IS NOT NULL;

UPDATE raw_items ri
SET connector_id = legacy.id,
    publisher_id = legacy.publisher_id,
    provider = 'gnews-legacy'
FROM news_sources legacy
WHERE legacy.name = 'Google News fallback (legacy)'
  AND LOWER(ri.provider) IN ('x', 'reddit')
  AND LOWER(ri.original_url) ~ '^https?://(www\.)?news\.google\.com/';

-- Repoint only stories whose hero item was corrected. If another story item
-- has a verified official publisher, preserve OFFICIAL; otherwise downgrade.
UPDATE news_articles article
SET source_id = legacy.id,
    verification_status = CASE
        WHEN EXISTS (
            SELECT 1
            FROM story_items membership
            JOIN raw_items item ON item.id = membership.raw_item_id
            JOIN publishers publisher ON publisher.id = item.publisher_id
            WHERE membership.story_id = article.id
              AND publisher.official = TRUE
        ) THEN 'OFFICIAL'
        ELSE 'SINGLE_REPORT'
    END
FROM news_sources legacy
WHERE legacy.name = 'Google News fallback (legacy)'
  AND article.hero_raw_item_id IN (
      SELECT item.id
      FROM raw_items item
      WHERE item.connector_id = legacy.id
  );
