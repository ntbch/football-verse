INSERT INTO news_categories (created_at, updated_at, name, slug)
VALUES (NOW(), NOW(), 'Others', 'others')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forum_categories (created_at, updated_at, name, slug)
VALUES (NOW(), NOW(), 'Others', 'others')
ON CONFLICT (slug) DO NOTHING;
