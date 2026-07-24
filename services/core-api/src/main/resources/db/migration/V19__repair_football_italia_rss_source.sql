UPDATE news_sources
SET name = 'Football Italia',
    feed_url = 'https://football-italia.net/feed/',
    source_type = 'RSS',
    provider = 'rss',
    css_selector = NULL,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE BTRIM(name) = 'Football Italia';
