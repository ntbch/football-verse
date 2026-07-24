UPDATE news_sources
SET feed_url = 'https://football-italia.net/feed/',
    source_type = 'RSS',
    provider = 'rss',
    css_selector = NULL,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Football Italia';

UPDATE news_sources
SET feed_url = 'https://www.skysports.com/rss/12040',
    source_type = 'RSS',
    provider = 'rss',
    css_selector = NULL,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Sky Sports Football';

UPDATE news_sources
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE source_type <> 'RSS';

UPDATE news_sources
SET provider = 'rss',
    css_selector = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE source_type = 'RSS';
