-- Recompute the denormalized verification field after discovery publishers
-- were corrected in V57. A story is not official when every known source is
-- an aggregator/social discovery connector or a legacy Google News fallback.
-- Repair two pre-existing duplicate Google News source URLs first. The URL is
-- preserved and only the duplicate projection receives a harmless query marker
-- so the existing unique constraint can be enforced by subsequent updates.
WITH duplicate_urls AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY id) AS duplicate_rank
    FROM news_articles
    WHERE source_url IS NOT NULL
)
UPDATE news_articles article
SET source_url = article.source_url
    || CASE WHEN POSITION('?' IN article.source_url) > 0 THEN '&' ELSE '?' END
    || 'legacy_duplicate=' || article.id
FROM duplicate_urls duplicate
WHERE article.id = duplicate.id
  AND duplicate.duplicate_rank > 1;

UPDATE news_articles article
SET verification_status = 'SINGLE_REPORT'
WHERE article.verification_status = 'OFFICIAL'
  AND article.id IN (
      SELECT membership.story_id
      FROM story_items membership
      JOIN raw_items item ON item.id = membership.raw_item_id
      GROUP BY membership.story_id
      HAVING BOOL_AND(
          LOWER(item.provider) IN ('gnews', 'googlenews', 'gnews-legacy', 'x', 'twitter', 'reddit')
          OR LOWER(item.original_url) ~ '^https?://(www\\.)?news\\.google\\.com/'
      )
  );
