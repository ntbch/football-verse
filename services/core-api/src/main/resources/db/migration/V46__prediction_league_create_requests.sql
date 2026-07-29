CREATE TABLE prediction_league_create_requests (
    request_id UUID PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    league_id BIGINT REFERENCES prediction_leagues(id) ON DELETE SET NULL,
    state VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);
