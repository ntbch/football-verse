-- Increase summary column length to TEXT for rich AI summaries
ALTER TABLE news_articles ALTER COLUMN summary TYPE TEXT;
