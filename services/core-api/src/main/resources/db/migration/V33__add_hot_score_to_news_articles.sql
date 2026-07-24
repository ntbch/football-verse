-- V33: Add hot_score for Phase 5 Story Ranking & Trending Feed
ALTER TABLE news_articles
    ADD COLUMN IF NOT EXISTS hot_score DOUBLE PRECISION NOT NULL DEFAULT 0.0;

ALTER TABLE news_articles
    ALTER COLUMN hot_score TYPE DOUBLE PRECISION USING hot_score::double precision;

CREATE INDEX IF NOT EXISTS idx_news_articles_hot_score
    ON news_articles(hot_score DESC, published_at DESC)
    WHERE status = 'PUBLISHED';
