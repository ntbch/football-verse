-- Seed Publishers for X (Twitter) Journalists & Outlets
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Fabrizio Romano (X)', 'x.com', true, 0.9800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'David Ornstein (X)', 'x.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gianluca Di Marzio (X)', 'x.com', true, 0.9500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ben Jacobs (X)', 'x.com', false, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sami Mokbel (X)', 'x.com', false, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Laurie Whitwell (X)', 'x.com', false, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'James Pearce (X)', 'x.com', false, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sam Lee (X)', 'x.com', false, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Matteo Moretto (X)', 'x.com', false, 0.9400, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Florian Plettenberg (X)', 'x.com', false, 0.9300, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gerard Romero (X)', 'x.com', false, 0.9100, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Mario Cortegana (X)', 'x.com', false, 0.9300, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Christian Falk (X)', 'x.com', false, 0.9000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Romeo Agresti (X)', 'x.com', false, 0.9200, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Daniele Longo (X)', 'x.com', false, 0.8800, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'OptaJoe (X)', 'x.com', true, 0.9900, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Statman Dave (X)', 'x.com', false, 0.9000, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors for X (Twitter)
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Fabrizio Romano (X)', 'https://x.com/FabrizioRomano', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Fabrizio Romano (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'David Ornstein (X)', 'https://x.com/David_Ornstein', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'David Ornstein (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gianluca Di Marzio (X)', 'https://x.com/DiMarzio', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Gianluca Di Marzio (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Ben Jacobs (X)', 'https://x.com/BenJacobs', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Ben Jacobs (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sami Mokbel (X)', 'https://x.com/SamiMokbel81_DM', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Sami Mokbel (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Laurie Whitwell (X)', 'https://x.com/lauriewhitwell', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Laurie Whitwell (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'James Pearce (X)', 'https://x.com/JamesPearceLFC', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'James Pearce (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sam Lee (X)', 'https://x.com/SamLee', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Sam Lee (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Matteo Moretto (X)', 'https://x.com/MatteMoretto', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Matteo Moretto (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Florian Plettenberg (X)', 'https://x.com/Plettigoal', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Florian Plettenberg (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Gerard Romero (X)', 'https://x.com/gerardromero', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Gerard Romero (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Mario Cortegana (X)', 'https://x.com/MarioCortegana', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Mario Cortegana (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Christian Falk (X)', 'https://x.com/cfbayern', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Christian Falk (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Romeo Agresti (X)', 'https://x.com/RomeoAgresti', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Romeo Agresti (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Daniele Longo (X)', 'https://x.com/86_longo', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Daniele Longo (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'OptaJoe (X)', 'https://x.com/OptaJoe', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'OptaJoe (X)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Statman Dave (X)', 'https://x.com/StatmanDave', true, 'RSS', 'x', true, (SELECT id FROM publishers WHERE name = 'Statman Dave (X)'))
ON CONFLICT (feed_url) DO NOTHING;
