-- Migration V52: Seed Reddit and X (Twitter) news sources and publishers

-- Seed Publishers
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/soccer', 'www.reddit.com', true, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/reddevils', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/Gunners', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/LiverpoolFC', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/realmadrid', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/barca', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Fabrizio Romano (X)', 'x.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'David Ornstein (X)', 'x.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ben Jacobs (X)', 'x.com', true, 0.8800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gianluca Di Marzio (X)', 'x.com', true, 0.9000, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/soccer', 'https://www.reddit.com/r/soccer', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/soccer')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/reddevils', 'https://www.reddit.com/r/reddevils', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/reddevils')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/Gunners', 'https://www.reddit.com/r/Gunners', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/Gunners')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/LiverpoolFC', 'https://www.reddit.com/r/LiverpoolFC', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/LiverpoolFC')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/realmadrid', 'https://www.reddit.com/r/realmadrid', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/realmadrid')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/barca', 'https://www.reddit.com/r/barca', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/barca')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Fabrizio Romano (X)', 'https://x.com/FabrizioRomano', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Fabrizio Romano (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'David Ornstein (X)', 'https://x.com/David_Ornstein', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'David Ornstein (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ben Jacobs (X)', 'https://x.com/JacobsBen', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Ben Jacobs (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gianluca Di Marzio (X)', 'https://x.com/DiMarzio', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Gianluca Di Marzio (X)'))
ON CONFLICT (feed_url) DO NOTHING;
