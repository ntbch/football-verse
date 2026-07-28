-- Seed Publishers for Additional Popular YouTube Football Channels
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Premier League Official (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'TNT Sports Football (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CBS Sports Golazo (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ESPN FC (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Real Madrid Official (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'FC Barcelona Official (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Manchester City (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Arsenal Official (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Manchester United (YouTube)', 'youtube.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Liverpool FC (YouTube)', 'youtube.com', true, 0.9900, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors for YouTube Football Channels
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Premier League Official (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCG5qGWdu8nIRZqJ_GgVAQ-w', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Premier League Official (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'TNT Sports Football (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4i_9WvfPRTuR20a701edZA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'TNT Sports Football (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CBS Sports Golazo (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC04n6G2JkW7G1w3tqL68XhA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'CBS Sports Golazo (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ESPN FC (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6-R3-b54X0R94qS5Cyl4qA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'ESPN FC (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Real Madrid Official (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWV3obpZVGgJ3j9FVhEjF2Q', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Real Madrid Official (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'FC Barcelona Official (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC14UlmYlSNiQCBe9Eookf_A', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'FC Barcelona Official (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Manchester City (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkzCjdRmrW2vziFYji08B2A', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Manchester City (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Arsenal Official (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpryVRk_VDudG871TekyV5w', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Arsenal Official (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Manchester United (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6yW44UGJJBvYTlfC7SRgHA', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Manchester United (YouTube)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Liverpool FC (YouTube)', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9LQwHZoucFT94I2h6fC06g', true, 'RSS', 'youtube', true, (SELECT id FROM publishers WHERE name = 'Liverpool FC (YouTube)'))
ON CONFLICT (feed_url) DO NOTHING;
