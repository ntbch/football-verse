CREATE TABLE football_contexts (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(24) NOT NULL,
    context_key VARCHAR(160) NOT NULL,
    display_name VARCHAR(180) NOT NULL,
    fixture_id BIGINT UNIQUE,
    CONSTRAINT uk_football_contexts_type_key UNIQUE (type, context_key),
    CONSTRAINT fk_football_contexts_fixture
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
);

CREATE INDEX idx_football_contexts_fixture_id ON football_contexts (fixture_id);
CREATE INDEX idx_football_contexts_type_key ON football_contexts (type, context_key);

CREATE TABLE news_article_contexts (
    article_id BIGINT NOT NULL,
    context_id BIGINT NOT NULL,
    PRIMARY KEY (article_id, context_id),
    CONSTRAINT fk_news_article_contexts_article
        FOREIGN KEY (article_id) REFERENCES news_articles (id),
    CONSTRAINT fk_news_article_contexts_context
        FOREIGN KEY (context_id) REFERENCES football_contexts (id)
);

CREATE INDEX idx_news_article_contexts_context_article
    ON news_article_contexts (context_id, article_id);

ALTER TABLE forum_threads ADD COLUMN context_id BIGINT;
ALTER TABLE forum_threads
    ADD CONSTRAINT fk_forum_threads_context
    FOREIGN KEY (context_id) REFERENCES football_contexts (id);
CREATE INDEX idx_forum_threads_context_visible_activity
    ON forum_threads (context_id, hidden, last_activity_at DESC);
