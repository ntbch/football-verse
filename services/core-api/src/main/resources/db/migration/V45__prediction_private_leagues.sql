CREATE TABLE prediction_leagues (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    invite_code VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE TABLE prediction_league_members (
    id BIGSERIAL PRIMARY KEY,
    league_id BIGINT NOT NULL REFERENCES prediction_leagues(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_prediction_league_member UNIQUE (league_id, user_id)
);

CREATE INDEX idx_prediction_league_members_user ON prediction_league_members(user_id);
