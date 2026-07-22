CREATE TABLE match_session_requests (
    request_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES match_sessions(id) ON DELETE CASCADE,
    career_save_id UUID NOT NULL,
    owner_user_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    response_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_session_requests_owner_request
    ON match_session_requests (owner_user_id, request_id);
CREATE INDEX idx_match_session_requests_created_at
    ON match_session_requests (created_at);
