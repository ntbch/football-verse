-- Migration V36: Delete unused and disabled news sources along with their raw items

WITH disabled_sources AS (
  SELECT id FROM news_sources WHERE active = false
),
target_raw_items AS (
  SELECT id FROM raw_items WHERE connector_id IN (SELECT id FROM disabled_sources)
),
del_story_items AS (
  DELETE FROM story_items WHERE raw_item_id IN (SELECT id FROM target_raw_items)
),
del_raw_items AS (
  DELETE FROM raw_items WHERE connector_id IN (SELECT id FROM disabled_sources)
)
DELETE FROM news_sources WHERE active = false;
