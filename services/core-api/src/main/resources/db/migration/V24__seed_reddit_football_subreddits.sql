-- Seed Publishers for Reddit Football Subreddits
INSERT INTO publishers (created_at, updated_at, name, canonical_domain, official, trust_score, active)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/soccer (Reddit)', 'reddit.com', false, 0.8500, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/reddevils (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/LiverpoolFC (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/Gunners (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/chelseafc (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/realmadrid (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/Barca (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/coys (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/mcfc (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/juve (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/ACMilan (Reddit)', 'reddit.com', false, 0.8000, true),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/FCBayern (Reddit)', 'reddit.com', false, 0.8000, true)
ON CONFLICT (name) DO NOTHING;

-- Seed News Sources Connectors for Reddit Subreddits (Native RSS)
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, provider, auto_publish, publisher_id)
VALUES
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/soccer (Reddit)', 'https://www.reddit.com/r/soccer/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/soccer (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/reddevils (Reddit)', 'https://www.reddit.com/r/reddevils/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/reddevils (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/LiverpoolFC (Reddit)', 'https://www.reddit.com/r/LiverpoolFC/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/LiverpoolFC (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/Gunners (Reddit)', 'https://www.reddit.com/r/Gunners/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/Gunners (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/chelseafc (Reddit)', 'https://www.reddit.com/r/chelseafc/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/chelseafc (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/realmadrid (Reddit)', 'https://www.reddit.com/r/realmadrid/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/realmadrid (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/Barca (Reddit)', 'https://www.reddit.com/r/Barca/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/Barca (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/coys (Reddit)', 'https://www.reddit.com/r/coys/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/coys (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/mcfc (Reddit)', 'https://www.reddit.com/r/mcfc/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/mcfc (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/juve (Reddit)', 'https://www.reddit.com/r/juve/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/juve (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/ACMilan (Reddit)', 'https://www.reddit.com/r/ACMilan/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/ACMilan (Reddit)')),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'r/FCBayern (Reddit)', 'https://www.reddit.com/r/FCBayern/hot.rss', true, 'RSS', 'reddit', true, (SELECT id FROM publishers WHERE name = 'r/FCBayern (Reddit)'))
ON CONFLICT (feed_url) DO NOTHING;
