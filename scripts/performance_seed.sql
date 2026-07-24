\set ON_ERROR_STOP on

INSERT INTO users (created_at, updated_at, email, username, password_hash, status)
SELECT now(), now(), 'perf-' || n || '@example.test', 'perf_' || n, 'not-a-login-credential', 'ACTIVE'
FROM generate_series(1, 10000) AS n
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_profiles (user_id, display_name)
SELECT id, username
FROM users
WHERE email LIKE 'perf-%@example.test'
ON CONFLICT (user_id) DO NOTHING;

WITH user_bounds AS (
    SELECT min(id) AS first_user FROM users WHERE email LIKE 'perf-%@example.test'
), category AS (
    SELECT min(id) AS category_id FROM news_categories
)
INSERT INTO news_articles (
    created_at, updated_at, title, slug, summary, content, status,
    category_id, author_id, source_url, content_hash, published_at
)
SELECT
    now() - (n || ' minutes')::interval,
    now(),
    'Performance article ' || n,
    'performance-article-' || n,
    'Generated performance fixture',
    repeat('Generated football content. ', 20),
    'PUBLISHED',
    category.category_id,
    user_bounds.first_user + ((n - 1) % 10000),
    'https://example.test/performance/articles/' || n,
    md5('performance-article-' || n),
    now() - (n || ' minutes')::interval
FROM generate_series(1, 50000) AS n
CROSS JOIN user_bounds
CROSS JOIN category
ON CONFLICT (slug) DO NOTHING;

WITH user_bounds AS (
    SELECT min(id) AS first_user FROM users WHERE email LIKE 'perf-%@example.test'
), category AS (
    SELECT min(id) AS category_id FROM forum_categories
)
INSERT INTO forum_threads (
    created_at, updated_at, title, slug, category_id, author_id,
    pinned, locked, hidden, solved, last_activity_at
)
SELECT
    now() - (n || ' minutes')::interval,
    now(),
    'Performance thread ' || n,
    'performance-thread-' || n,
    category.category_id,
    user_bounds.first_user + ((n - 1) % 10000),
    false, false, false, false, now()
FROM generate_series(1, 10000) AS n
CROSS JOIN user_bounds
CROSS JOIN category
ON CONFLICT (slug) DO NOTHING;

WITH user_bounds AS (
    SELECT min(id) AS first_user FROM users WHERE email LIKE 'perf-%@example.test'
), thread_bounds AS (
    SELECT min(id) AS first_thread FROM forum_threads WHERE slug LIKE 'performance-thread-%'
)
INSERT INTO forum_posts (created_at, updated_at, thread_id, author_id, content, hidden)
SELECT
    now() - (n || ' seconds')::interval,
    now(),
    thread_bounds.first_thread + ((n - 1) % 10000),
    user_bounds.first_user + ((n - 1) % 10000),
    'Generated performance post ' || n,
    false
FROM generate_series(1, 100000) AS n
CROSS JOIN user_bounds
CROSS JOIN thread_bounds;

INSERT INTO fixtures (
    fixture_id, league_slug, round, home_team, away_team, kickoff,
    home_score, away_score, status, scored
)
SELECT
    'performance-fixture-' || n,
    'premier-league',
    'Performance round ' || (((n - 1) % 38) + 1),
    'Home ' || n,
    'Away ' || n,
    now() + (n || ' minutes')::interval,
    null, null, 'upcoming', false
FROM generate_series(1, 1000) AS n
ON CONFLICT (fixture_id) DO NOTHING;

WITH user_bounds AS (
    SELECT min(id) AS first_user FROM users WHERE email LIKE 'perf-%@example.test'
), fixture_bounds AS (
    SELECT min(id) AS first_fixture FROM fixtures WHERE fixture_id LIKE 'performance-fixture-%'
)
INSERT INTO user_predictions (
    created_at, updated_at, user_id, match_id, pick, points, correct
)
SELECT
    now(), now(),
    user_bounds.first_user + ((n - 1) % 10000),
    fixture_bounds.first_fixture + (((n - 1) / 10000) % 1000),
    CASE (n % 3) WHEN 0 THEN 'home' WHEN 1 THEN 'draw' ELSE 'away' END,
    0, false
FROM generate_series(1, 100000) AS n
CROSS JOIN user_bounds
CROSS JOIN fixture_bounds
ON CONFLICT (user_id, match_id) DO NOTHING;

INSERT INTO prediction_stats (
    user_id, total_points, correct_picks, total_picks, current_streak, best_streak
)
SELECT id, id % 500, id % 20, 10, id % 5, id % 10
FROM users
WHERE email LIKE 'perf-%@example.test'
ON CONFLICT (user_id) DO NOTHING;

SELECT
    (SELECT count(*) FROM users WHERE email LIKE 'perf-%@example.test') AS users,
    (SELECT count(*) FROM news_articles WHERE slug LIKE 'performance-article-%') AS articles,
    (SELECT count(*) FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE t.slug LIKE 'performance-thread-%') AS forum_posts,
    (SELECT count(*) FROM user_predictions up JOIN fixtures f ON f.id = up.match_id WHERE f.fixture_id LIKE 'performance-fixture-%') AS predictions;

