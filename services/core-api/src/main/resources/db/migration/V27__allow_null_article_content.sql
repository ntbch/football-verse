-- Phase 7 Item 2: Schema Contraction for No-Crawl Aggregated Stories
-- Allow `content` column in `news_articles` to be NULL for AGGREGATED_STORY items.

ALTER TABLE news_articles ALTER COLUMN content DROP NOT NULL;
