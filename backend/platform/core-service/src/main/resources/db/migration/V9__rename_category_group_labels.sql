UPDATE news_categories SET name = 'League News', updated_at = NOW()
WHERE slug = 'league-tournament-news';
UPDATE news_categories SET name = 'Match Analysis', updated_at = NOW()
WHERE slug = 'match-preview-analysis';
UPDATE news_categories SET name = 'Transfers', updated_at = NOW()
WHERE slug = 'transfer-news';
UPDATE news_categories SET name = 'Opinions', updated_at = NOW()
WHERE slug = 'expert-fan-opinions';
UPDATE news_categories SET name = 'Football Facts', updated_at = NOW()
WHERE slug = 'football-facts-tactical-insights';

UPDATE forum_categories SET name = 'League News', updated_at = NOW()
WHERE slug = 'league-tournament-news';
UPDATE forum_categories SET name = 'Match Analysis', updated_at = NOW()
WHERE slug = 'match-preview-analysis';
UPDATE forum_categories SET name = 'Transfers', updated_at = NOW()
WHERE slug = 'transfer-news';
UPDATE forum_categories SET name = 'Opinions', updated_at = NOW()
WHERE slug = 'expert-fan-opinions';
UPDATE forum_categories SET name = 'Football Facts', updated_at = NOW()
WHERE slug = 'football-facts-tactical-insights';
