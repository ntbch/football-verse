-- Cover the filtered public-news read path without changing its response contract.
CREATE INDEX IF NOT EXISTS idx_news_articles_category_published
    ON news_articles(category_id, published_at DESC)
    WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS idx_news_sources_provider
    ON news_sources(provider);

CREATE INDEX IF NOT EXISTS idx_raw_items_provider_connector
    ON raw_items(provider, connector_id);
