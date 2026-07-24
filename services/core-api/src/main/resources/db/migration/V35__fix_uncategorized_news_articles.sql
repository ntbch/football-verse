-- Re-categorize news_articles with high precision rules

-- 1. Expert & Fan Opinions (behavior, statements, controversies, quotes, pundit reactions)
UPDATE news_articles
SET category_id = (SELECT id FROM news_categories WHERE slug = 'expert-fan-opinions' LIMIT 1)
WHERE LOWER(title) LIKE '%behaviour%'
   OR LOWER(title) LIKE '%behavior%'
   OR LOWER(title) LIKE '%intolerable%'
   OR LOWER(title) LIKE '%unacceptable%'
   OR LOWER(title) LIKE '%slams%'
   OR LOWER(title) LIKE '%blasts%'
   OR LOWER(title) LIKE '%criticis%'
   OR LOWER(title) LIKE '%criticiz%'
   OR LOWER(title) LIKE '%controversy%'
   OR LOWER(title) LIKE '%opinion%'
   OR LOWER(title) LIKE '%says %'
   OR LOWER(title) LIKE '%claims %';

-- 2. Transfer News (strictly transfer/signing related headlines)
UPDATE news_articles
SET category_id = (SELECT id FROM news_categories WHERE slug = 'transfer-news' LIMIT 1)
WHERE (
    LOWER(title) LIKE '%transfer%'
    OR LOWER(title) LIKE '%signing%'
    OR LOWER(title) LIKE '%signed%'
    OR LOWER(title) LIKE '%signs%'
    OR LOWER(title) LIKE '%loan deal%'
    OR LOWER(title) LIKE '%bid%'
    OR LOWER(title) LIKE '%bought %'
    OR LOWER(title) LIKE '%release clause%'
    OR LOWER(title) LIKE '%free agent%'
    OR LOWER(title) LIKE '%here we go%'
  )
  AND LOWER(title) NOT LIKE '%behaviour%'
  AND LOWER(title) NOT LIKE '%behavior%';

-- 3. Match Preview & In-Depth Analysis (match reports, predictions, lineups, vs, highlights)
UPDATE news_articles
SET category_id = (SELECT id FROM news_categories WHERE slug = 'match-preview-analysis' LIMIT 1)
WHERE (
    LOWER(title) LIKE '%vs %'
    OR LOWER(title) LIKE '% vs %'
    OR LOWER(title) LIKE '%beat %'
    OR LOWER(title) LIKE '%defeated%'
    OR LOWER(title) LIKE '%highlight%'
    OR LOWER(title) LIKE '%match report%'
    OR LOWER(title) LIKE '%lineup%'
    OR LOWER(title) LIKE '%starting xi%'
  )
  AND category_id != (SELECT id FROM news_categories WHERE slug = 'transfer-news' LIMIT 1);

-- 4. Football Facts & Tactical Insights
UPDATE news_articles
SET category_id = (SELECT id FROM news_categories WHERE slug = 'football-facts-tactical-insights' LIMIT 1)
WHERE (
    LOWER(title) LIKE '%tactic%'
    OR LOWER(title) LIKE '%stats%'
    OR LOWER(title) LIKE '%xg%'
    OR LOWER(title) LIKE '%analysis%'
    OR LOWER(title) LIKE '%turned complete %'
    OR LOWER(title) LIKE '%record broken%'
  )
  AND category_id != (SELECT id FROM news_categories WHERE slug = 'transfer-news' LIMIT 1);

-- 5. Default remaining articles without a valid category or uncategorized to 'League News'
UPDATE news_articles
SET category_id = (SELECT id FROM news_categories WHERE slug = 'league-tournament-news' LIMIT 1)
WHERE category_id IS NULL 
   OR category_id NOT IN (SELECT id FROM news_categories);
