CREATE TABLE career_saves (
    id UUID PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    game_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_career_saves_owner ON career_saves(owner_user_id);

CREATE TABLE clubs (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    reputation INTEGER NOT NULL DEFAULT 1,
    balance NUMERIC(19,2) NOT NULL DEFAULT 0,
    UNIQUE (career_save_id, name)
);

CREATE TABLE players (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    primary_position VARCHAR(10) NOT NULL,
    attributes JSONB NOT NULL,
    fitness NUMERIC(5,2) NOT NULL DEFAULT 100,
    morale NUMERIC(5,2) NOT NULL DEFAULT 50,
    form NUMERIC(5,2) NOT NULL DEFAULT 50
);
CREATE INDEX idx_players_club ON players(club_id);

CREATE TABLE fixtures (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    home_club_id UUID NOT NULL REFERENCES clubs(id),
    away_club_id UUID NOT NULL REFERENCES clubs(id),
    match_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    CHECK (home_club_id <> away_club_id)
);
CREATE INDEX idx_fixtures_career_date ON fixtures(career_save_id, match_date);

CREATE TABLE matches (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    fixture_id UUID NOT NULL UNIQUE REFERENCES fixtures(id),
    owner_user_id BIGINT NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    seed BIGINT NOT NULL,
    engine_version VARCHAR(30) NOT NULL,
    ruleset_version VARCHAR(30) NOT NULL,
    input_snapshot JSONB NOT NULL,
    result_snapshot JSONB,
    home_score INTEGER,
    away_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (owner_user_id, idempotency_key)
);

CREATE TABLE match_events (
    id BIGSERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    second INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL,
    team_id UUID,
    player_id UUID,
    zone VARCHAR(30),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (match_id, sequence)
);

CREATE TABLE match_team_stats (
    id BIGSERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL,
    stats JSONB NOT NULL,
    UNIQUE (match_id, team_id)
);

CREATE TABLE match_player_stats (
    id BIGSERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    team_id UUID NOT NULL,
    stats JSONB NOT NULL,
    UNIQUE (match_id, player_id)
);
