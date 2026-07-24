CREATE TABLE career_operation_requests (
    request_id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL,
    action VARCHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL CHECK (state IN ('PENDING', 'COMPLETED')),
    response_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_operation_requests_owner_request
    ON career_operation_requests (owner_user_id, request_id);
CREATE INDEX idx_career_operation_requests_updated_at
    ON career_operation_requests (updated_at);
