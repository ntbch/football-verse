CREATE TABLE match_sessions (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL,
    request_id UUID NOT NULL,
    last_request_id UUID,
    status VARCHAR(20) NOT NULL,
    input_snapshot JSONB NOT NULL,
    state_snapshot JSONB NOT NULL,
    match_id UUID REFERENCES matches(id),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_user_id, request_id)
);

CREATE UNIQUE INDEX uq_match_sessions_active_career
    ON match_sessions (career_save_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX uq_match_sessions_active_fixture
    ON match_sessions (fixture_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_match_sessions_owner_career ON match_sessions (owner_user_id, career_save_id);
