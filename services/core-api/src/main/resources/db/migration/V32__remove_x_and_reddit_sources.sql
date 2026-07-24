-- Migration V32: Deactivate X (Twitter) and Reddit news sources and purge associated articles

UPDATE news_sources
SET active = false, auto_publish = false, updated_at = CURRENT_TIMESTAMP
WHERE provider IN ('x', 'twitter', 'reddit')
   OR source_type IN ('X', 'REDDIT')
   OR name LIKE '%(X)%'
   OR feed_url LIKE '%reddit.com%'
   OR feed_url LIKE '%twitter.com%'
   OR feed_url LIKE '%x.com%';

WITH target_articles AS (
  SELECT id FROM news_articles
  WHERE source_url LIKE '%x.com%'
     OR source_url LIKE '%twitter.com%'
     OR source_url LIKE '%reddit.com%'
     OR source_id IN (
         SELECT id FROM news_sources 
         WHERE provider IN ('x', 'twitter', 'reddit') OR source_type IN ('X', 'REDDIT')
     )
),
del_story_items AS (
  DELETE FROM story_items WHERE story_id IN (SELECT id FROM target_articles) OR raw_item_id IN (SELECT id FROM target_articles)
),
del_likes AS (
  DELETE FROM news_likes WHERE article_id IN (SELECT id FROM target_articles)
),
del_bookmarks AS (
  DELETE FROM news_bookmarks WHERE article_id IN (SELECT id FROM target_articles)
),
del_comments AS (
  DELETE FROM news_comments WHERE article_id IN (SELECT id FROM target_articles)
),
del_tags AS (
  DELETE FROM news_article_tags WHERE article_id IN (SELECT id FROM target_articles)
)
DELETE FROM news_articles WHERE id IN (SELECT id FROM target_articles);
