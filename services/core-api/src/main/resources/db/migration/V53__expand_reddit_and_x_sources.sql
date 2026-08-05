-- Migration V53: Expand Reddit subreddits and X (Twitter) journalist sources

-- Seed New Publishers
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/chelseafc', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/coys', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/MCFC', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/BayernMunich', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/Juve', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/ACMilan', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/PSG', 'www.reddit.com', true, 0.8200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/bootroom', 'www.reddit.com', true, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gerard Romero (X)', 'x.com', true, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Florian Plettenberg (X)', 'x.com', true, 0.9300, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'James Pearce (X)', 'x.com', true, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Laurie Whitwell (X)', 'x.com', true, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sami Mokbel (X)', 'x.com', true, 0.8800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sam Lee (X)', 'x.com', true, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Matteo Moretto (X)', 'x.com', true, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Romain Molina (X)', 'x.com', true, 0.8700, true)
ON CONFLICT (name) DO NOTHING;

-- Seed New News Sources
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/chelseafc', 'https://www.reddit.com/r/chelseafc', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/chelseafc')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/coys', 'https://www.reddit.com/r/coys', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/coys')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/MCFC', 'https://www.reddit.com/r/MCFC', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/MCFC')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/BayernMunich', 'https://www.reddit.com/r/BayernMunich', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/BayernMunich')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/Juve', 'https://www.reddit.com/r/Juve', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/Juve')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/ACMilan', 'https://www.reddit.com/r/ACMilan', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/ACMilan')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/PSG', 'https://www.reddit.com/r/PSG', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/PSG')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Reddit r/bootroom', 'https://www.reddit.com/r/bootroom', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'Reddit r/bootroom')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gerard Romero (X)', 'https://x.com/gerardromero', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Gerard Romero (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Florian Plettenberg (X)', 'https://x.com/Plettigoal', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Florian Plettenberg (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'James Pearce (X)', 'https://x.com/JamesPearceLFC', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'James Pearce (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Laurie Whitwell (X)', 'https://x.com/lauriewhitwell', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Laurie Whitwell (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sami Mokbel (X)', 'https://x.com/SamiMokbel81_DM', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Sami Mokbel (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sam Lee (X)', 'https://x.com/SamLee', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Sam Lee (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Matteo Moretto (X)', 'https://x.com/MatteMoretto', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Matteo Moretto (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Romain Molina (X)', 'https://x.com/Romain_Molina', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Romain Molina (X)'))
ON CONFLICT (feed_url) DO NOTHING;
