-- Migration V28: Enable auto_publish for all active RSS news sources so that traditional feeds (Sky Sports, Football Italia, BBC, etc.) are published automatically
UPDATE news_sources
SET auto_publish = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE active = TRUE AND source_type = 'RSS';
