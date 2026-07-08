-- Seed Users (Default admin and moderator with BCrypt hash of 'ChangeMe123!')
INSERT INTO users (created_at, updated_at, email, username, password_hash, status)
VALUES 
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin@footballverse.local', 'admin', '$2a$10$wR1VpMsP2wI74L9XlC/GSuW9x2wY2EwB6h8o8N2VfS8B6j6v4I76S', 'ACTIVE'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'moderator@footballverse.local', 'moderator', '$2a$10$wR1VpMsP2wI74L9XlC/GSuW9x2wY2EwB6h8o8N2VfS8B6j6v4I76S', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Seed User Roles
INSERT INTO user_roles (user_id, role)
VALUES 
((SELECT id FROM users WHERE email = 'admin@footballverse.local'), 'ADMIN'),
((SELECT id FROM users WHERE email = 'moderator@footballverse.local'), 'MODERATOR')
ON CONFLICT DO NOTHING;

-- Seed User Profiles
INSERT INTO user_profiles (user_id, display_name)
VALUES 
((SELECT id FROM users WHERE email = 'admin@footballverse.local'), 'Admin'),
((SELECT id FROM users WHERE email = 'moderator@footballverse.local'), 'Moderator')
ON CONFLICT (user_id) DO NOTHING;

-- Seed News Categories
INSERT INTO news_categories (created_at, updated_at, name, slug)
VALUES 
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'League News', 'league-tournament-news'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Match Analysis', 'match-preview-analysis'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Transfers', 'transfer-news'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Off the Pitch', 'off-the-pitch'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Opinions', 'expert-fan-opinions'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football Facts', 'football-facts-tactical-insights'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Others', 'others')
ON CONFLICT (slug) DO NOTHING;

-- Seed Forum Categories
INSERT INTO forum_categories (created_at, updated_at, name, slug)
VALUES 
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'League News', 'league-tournament-news'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Match Analysis', 'match-preview-analysis'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Transfers', 'transfer-news'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Off the Pitch', 'off-the-pitch'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Opinions', 'expert-fan-opinions'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football Facts', 'football-facts-tactical-insights'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Others', 'others')
ON CONFLICT (slug) DO NOTHING;

-- Seed News Sources (for crawler scraping)
INSERT INTO news_sources (created_at, updated_at, name, feed_url, active, source_type, css_selector)
VALUES 
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Football Italia', 'https://football-italia.net/post-sitemap.xml', true, 'SITEMAP', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Goal.com', 'https://www.goal.com/en/sitemap/google-news.xml', true, 'SITEMAP', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Sky Sports Football', 'https://www.skysports.com/football', true, 'HOMEPAGE', '.sdc-site-tile__headline a'),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ESPN Soccer', 'https://www.espn.com/espn/rss/soccer/news', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'BBC Sport Football', 'https://feeds.bbci.co.uk/sport/football/rss.xml', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Transfermarkt', 'https://www.transfermarkt.co.uk/rss/news', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Tribuna.com', 'https://tribuna.com/rss/news', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'The Guardian Football', 'https://www.theguardian.com/football/rss', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Mirror Football', 'https://www.mirror.co.uk/sport/football/rss.xml', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'The Athletic Football', 'https://www.nytimes.com/athletic/rss/football/', true, 'RSS', NULL),
(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Daily Mail Football', 'https://www.dailymail.co.uk/sport/football/index.rss', true, 'RSS', NULL)
ON CONFLICT (feed_url) DO NOTHING;
