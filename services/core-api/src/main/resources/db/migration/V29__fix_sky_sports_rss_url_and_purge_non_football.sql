-- Migration V29: Fix Sky Sports Football RSS URL and purge non-football articles (F1, Tennis, Darts, Racing)

-- 1. Correct Sky Sports Football RSS feed URL from top sports news (12040) to Football RSS (11095)
UPDATE news_sources
SET feed_url = 'https://www.skysports.com/rss/11095',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Sky Sports Football';

-- 2. Purge dependent records first
DELETE FROM story_items
WHERE story_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

DELETE FROM story_key_points
WHERE story_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

DELETE FROM news_likes
WHERE article_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

DELETE FROM news_bookmarks
WHERE article_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

DELETE FROM news_comments
WHERE article_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

DELETE FROM news_article_tags
WHERE article_id IN (
    SELECT id FROM news_articles
    WHERE LOWER(source_url) LIKE '%/f1/%' OR LOWER(source_url) LIKE '%/tennis/%' OR LOWER(source_url) LIKE '%/racing/%'
       OR LOWER(source_url) LIKE '%/darts/%' OR LOWER(source_url) LIKE '%/golf/%' OR LOWER(source_url) LIKE '%/cricket/%'
       OR LOWER(title) LIKE '%formula 1%' OR LOWER(title) LIKE '%grand prix%' OR LOWER(title) LIKE '%mubadala dc open%' OR LOWER(title) LIKE '%world matchplay%'
);

-- 3. Purge non-football articles from news_articles table
DELETE FROM news_articles
WHERE LOWER(source_url) LIKE '%/f1/%'
   OR LOWER(source_url) LIKE '%/tennis/%'
   OR LOWER(source_url) LIKE '%/racing/%'
   OR LOWER(source_url) LIKE '%/darts/%'
   OR LOWER(source_url) LIKE '%/golf/%'
   OR LOWER(source_url) LIKE '%/cricket/%'
   OR LOWER(title) LIKE '%formula 1%'
   OR LOWER(title) LIKE '%grand prix%'
   OR LOWER(title) LIKE '%mubadala dc open%'
   OR LOWER(title) LIKE '%world matchplay%';

-- 4. Purge non-football items from raw_items table
DELETE FROM raw_items
WHERE LOWER(original_url) LIKE '%/f1/%'
   OR LOWER(original_url) LIKE '%/tennis/%'
   OR LOWER(original_url) LIKE '%/racing/%'
   OR LOWER(original_url) LIKE '%/darts/%'
   OR LOWER(original_url) LIKE '%/golf/%'
   OR LOWER(original_url) LIKE '%/cricket/%'
   OR LOWER(title) LIKE '%formula 1%'
   OR LOWER(title) LIKE '%grand prix%'
   OR LOWER(title) LIKE '%mubadala dc open%'
   OR LOWER(title) LIKE '%world matchplay%';
