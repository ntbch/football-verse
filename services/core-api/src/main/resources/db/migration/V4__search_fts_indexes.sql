CREATE INDEX idx_news_articles_fts ON news_articles USING gin(to_tsvector('simple', title || ' ' || COALESCE(summary, '') || ' ' || content));
CREATE INDEX idx_forum_threads_title_fts ON forum_threads USING gin(to_tsvector('simple', title));
CREATE INDEX idx_forum_posts_content_fts ON forum_posts USING gin(to_tsvector('simple', content));
