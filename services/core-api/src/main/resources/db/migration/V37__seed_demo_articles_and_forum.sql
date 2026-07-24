-- Seed Initial Demo News Articles
INSERT INTO news_articles (created_at, updated_at, title, slug, summary, content, status, category_id, source_id, author_id, source_url, content_hash, published_at, hot_score)
VALUES 
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Real Madrid Secure Dramatic 3-2 Comeback Win Over Barcelona in El Clasico', 
    'real-madrid-secure-dramatic-comeback-win-el-clasico', 
    'Jude Bellingham scored a stoppage-time winner as Real Madrid came from behind twice to defeat Barcelona 3-2 in a thrilling El Clasico at the Santiago Bernabeu.', 
    '<p>Real Madrid took a massive step towards securing the La Liga title with a thrilling 3-2 victory over fierce rivals Barcelona at the Santiago Bernabeu.</p><p>Barcelona took an early lead through Andreas Christensen before Vinicius Junior equalized from the penalty spot. Fermin Lopez restored Barcelona''s lead in the second half, but Lucas Vazquez leveled again for Los Blancos.</p><p>In the 91st minute, Jude Bellingham arrived at the far post to fire home the winning goal, sending the Bernabeu into raptures and opening up an 11-point lead at the top of the table.</p>', 
    'PUBLISHED', 
    (SELECT id FROM news_categories WHERE slug = 'match-preview-analysis'), 
    (SELECT id FROM news_sources LIMIT 1), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'https://example.com/news/el-clasico-real-madrid-barcelona-3-2', 
    'hash_demo_article_1', 
    CURRENT_TIMESTAMP - INTERVAL '2 hours', 
    95.5
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Manchester City Eye Summer Transfer Move for Bundesliga Prodigy', 
    'manchester-city-eye-summer-transfer-move-bundesliga-prodigy', 
    'Pep Guardiola''s side are reportedly leading the race to sign Bayer Leverkusen''s star playmaker in a record-breaking deal this summer.', 
    '<p>Manchester City are preparing a mega offer to bolster their midfield options ahead of next season.</p><p>Scouts from the Premier League champions have monitored the player in multiple Champions League matches this season. Negotiation talks are expected to begin as soon as the transfer window opens.</p>', 
    'PUBLISHED', 
    (SELECT id FROM news_categories WHERE slug = 'transfer-news'), 
    (SELECT id FROM news_sources LIMIT 1), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'https://example.com/news/mancity-transfer-move-bundesliga', 
    'hash_demo_article_2', 
    CURRENT_TIMESTAMP - INTERVAL '5 hours', 
    88.0
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Champions League Quarter-Final Preview: Tactical Breakdown of Arsenal vs Bayern Munich', 
    'champions-league-quarter-final-preview-arsenal-bayern-munich', 
    'An in-depth analysis of the key tactical battles that will decide the blockbuster UEFA Champions League clash at the Emirates Stadium.', 
    '<p>Arsenal host Bayern Munich in one of the most anticipated Champions League quarter-finals in recent memory.</p><p>Mikel Arteta''s defensively resolute Gunners face a Bayern Munich side boasting Harry Kane in lethal form. Key areas to watch include Bukayo Saka vs Alphonso Davies on the flank, and Arsenal''s high-pressing system against Bayern''s transition speed.</p>', 
    'PUBLISHED', 
    (SELECT id FROM news_categories WHERE slug = 'football-facts-tactical-insights'), 
    (SELECT id FROM news_sources LIMIT 1), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'https://example.com/news/arsenal-bayern-tactical-preview', 
    'hash_demo_article_3', 
    CURRENT_TIMESTAMP - INTERVAL '1 day', 
    91.2
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Liverpool Announce Major Contract Extension for Star Forward', 
    'liverpool-announce-major-contract-extension-star-forward', 
    'The Reds have put an end to transfer speculation by committing their star player to a long-term contract extension at Anfield.', 
    '<p>Liverpool Football Club is delighted to announce that a new long-term deal has been signed today.</p><p>Expressing delight at the agreement, the player stated: "I am extremely happy to continue my journey at this special club. We have big goals for the future and I want to win more trophies here."</p>', 
    'PUBLISHED', 
    (SELECT id FROM news_categories WHERE slug = 'league-tournament-news'), 
    (SELECT id FROM news_sources LIMIT 1), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'https://example.com/news/liverpool-contract-extension', 
    'hash_demo_article_4', 
    CURRENT_TIMESTAMP - INTERVAL '1 day 4 hours', 
    82.4
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Tactical Analysis: How Inverted Full-Backs are Revolutionizing Modern European Football', 
    'tactical-analysis-how-inverted-full-backs-are-revolutionizing-football', 
    'From Pep Guardiola to Mikel Arteta and Roberto De Zerbi, managers are reshaping build-up play by tucking full-backs into central midfield.', 
    '<p>The role of full-backs in modern football has evolved rapidly over the past decade.</p><p>No longer restricted to overlapping down the touchline, full-backs are now expected to invert into central midfield pockets during possession, creating numerical superiorities in midfield and providing defensive solidity against counter-attacks.</p>', 
    'PUBLISHED', 
    (SELECT id FROM news_categories WHERE slug = 'football-facts-tactical-insights'), 
    (SELECT id FROM news_sources LIMIT 1), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'https://example.com/news/inverted-full-backs-tactical-analysis', 
    'hash_demo_article_5', 
    CURRENT_TIMESTAMP - INTERVAL '2 days', 
    79.0
)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Demo Forum Threads
INSERT INTO forum_threads (created_at, updated_at, title, slug, category_id, author_id, pinned, locked, hidden)
VALUES 
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Who will win the Premier League title this season? Predictions & Discussion', 
    'who-will-win-premier-league-title-this-season', 
    (SELECT id FROM forum_categories WHERE slug = 'league-tournament-news'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    true, false, false
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Summer Transfer Window 2026: Official Megathread', 
    'summer-transfer-window-2026-official-megathread', 
    (SELECT id FROM forum_categories WHERE slug = 'transfer-news'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    true, false, false
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    'Tactical Discussion: Is 3-4-2-1 making a major comeback in Europe?', 
    'tactical-discussion-is-3-4-2-1-making-comeback', 
    (SELECT id FROM forum_categories WHERE slug = 'football-facts-tactical-insights'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    false, false, false
)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Demo Forum Posts
INSERT INTO forum_posts (created_at, updated_at, thread_id, author_id, content, hidden)
VALUES 
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    (SELECT id FROM forum_threads WHERE slug = 'who-will-win-premier-league-title-this-season'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'Welcome to the official Premier League Title Race discussion thread! Drop your score predictions, tactical thoughts, and analysis below.', 
    false
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    (SELECT id FROM forum_threads WHERE slug = 'summer-transfer-window-2026-official-megathread'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'Use this thread to post verified transfer rumors, official club announcements, and agent updates for the 2026 summer window.', 
    false
),
(
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
    (SELECT id FROM forum_threads WHERE slug = 'tactical-discussion-is-3-4-2-1-making-comeback'), 
    (SELECT id FROM users WHERE username = 'admin'), 
    'We have seen Bayer Leverkusen, Atalanta, and Sporting CP excel with 3-4-2-1 back-three systems. What are your thoughts on this tactical trend?', 
    false
)
ON CONFLICT DO NOTHING;
