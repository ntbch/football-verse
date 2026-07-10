INSERT INTO news_categories (created_at, updated_at, name, slug) VALUES
    (NOW(), NOW(), 'League & Tournament News', 'league-tournament-news'),
    (NOW(), NOW(), 'Match Preview & In-Depth Analysis', 'match-preview-analysis'),
    (NOW(), NOW(), 'Transfer News', 'transfer-news'),
    (NOW(), NOW(), 'Off the Pitch', 'off-the-pitch'),
    (NOW(), NOW(), 'Expert & Fan Opinions', 'expert-fan-opinions'),
    (NOW(), NOW(), 'Football Facts & Tactical Insights', 'football-facts-tactical-insights')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forum_categories (created_at, updated_at, name, slug) VALUES
    (NOW(), NOW(), 'League & Tournament News', 'league-tournament-news'),
    (NOW(), NOW(), 'Match Preview & In-Depth Analysis', 'match-preview-analysis'),
    (NOW(), NOW(), 'Transfer News', 'transfer-news'),
    (NOW(), NOW(), 'Off the Pitch', 'off-the-pitch'),
    (NOW(), NOW(), 'Expert & Fan Opinions', 'expert-fan-opinions'),
    (NOW(), NOW(), 'Football Facts & Tactical Insights', 'football-facts-tactical-insights')
ON CONFLICT (slug) DO NOTHING;

UPDATE news_articles
SET category_id = target.id
FROM news_categories old_category, news_categories target
WHERE news_articles.category_id = old_category.id
  AND old_category.slug = 'matchday'
  AND target.slug = 'league-tournament-news';

UPDATE news_articles
SET category_id = target.id
FROM news_categories old_category, news_categories target
WHERE news_articles.category_id = old_category.id
  AND old_category.slug = 'transfers'
  AND target.slug = 'transfer-news';

UPDATE forum_threads
SET category_id = target.id
FROM forum_categories old_category, forum_categories target
WHERE forum_threads.category_id = old_category.id
  AND old_category.slug = 'premier-league'
  AND target.slug = 'league-tournament-news';

UPDATE forum_threads
SET category_id = target.id
FROM forum_categories old_category, forum_categories target
WHERE forum_threads.category_id = old_category.id
  AND old_category.slug = 'transfers'
  AND target.slug = 'transfer-news';

UPDATE forum_threads
SET category_id = target.id
FROM forum_categories old_category, forum_categories target
WHERE forum_threads.category_id = old_category.id
  AND old_category.slug = 'general-football'
  AND target.slug = 'expert-fan-opinions';

DELETE FROM news_categories WHERE slug IN ('matchday', 'transfers');
DELETE FROM forum_categories WHERE slug IN ('premier-league', 'transfers', 'general-football');
