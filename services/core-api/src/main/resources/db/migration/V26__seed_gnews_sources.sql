-- Seed Publishers for Google News (GNews)
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Football (GNews)', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Transfers (GNews)', 'news.google.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Champions League (GNews)', 'news.google.com', true, 0.9500, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors for Google News RSS Feeds (Native Free RSS, Zero API Key)
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Football (GNews)', 'https://news.google.com/rss/search?q=football&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Football (GNews)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Transfers (GNews)', 'https://news.google.com/rss/search?q=football+transfers&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Transfers (GNews)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Google News Champions League (GNews)', 'https://news.google.com/rss/search?q=champions+league&hl=en-US&gl=US&ceid=US:en', true, 'RSS', 'gnews', true, (SELECT id FROM publishers WHERE name = 'Google News Champions League (GNews)'))
ON CONFLICT (feed_url) DO NOTHING;
