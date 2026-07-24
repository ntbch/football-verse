-- Seed Publishers for Official YouTube Highlight Channels
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sky Sports Football (YouTube Highlights)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Serie A Official (YouTube Highlights)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'LaLiga Official (YouTube Highlights)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ligue 1 Official (YouTube Highlights)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'The FA Cup Official (YouTube Highlights)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Bundesliga Official (YouTube Highlights)', 'youtube.com', true, 0.9900, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors for YouTube Match Highlights (Native YouTube RSS)
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sky Sports Football (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNAf1k0yIjyGu3k9BwAg3lg', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Sky Sports Football (YouTube Highlights)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Serie A Official (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBJeMCInqqirvrU7E72GD5g', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Serie A Official (YouTube Highlights)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'LaLiga Official (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCn3i01b7oW-bE7y6N1JtEGA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'LaLiga Official (YouTube Highlights)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ligue 1 Official (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWkX1l2Lz54S36S3R3n17qA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Ligue 1 Official (YouTube Highlights)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'The FA Cup Official (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCg1y2P4C2g7-248P0u16p4A', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'The FA Cup Official (YouTube Highlights)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Bundesliga Official (YouTube Highlights)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6UL29enLNe4xmWfU41Nmjg', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Bundesliga Official (YouTube Highlights)'))
ON CONFLICT (feed_url) DO NOTHING;
