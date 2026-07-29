ALTER TABLE news_articles
    ADD COLUMN cluster_embedding TEXT,
    ADD COLUMN cluster_embedding_model VARCHAR(80);

CREATE INDEX idx_news_articles_cluster_window
    ON news_articles(content_kind, status, last_source_at DESC)
    WHERE content_kind = 'AGGREGATED_STORY' AND status = 'PUBLISHED';
