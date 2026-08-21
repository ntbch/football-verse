CREATE TABLE minigame_daily_runs (
    id BIGSERIAL PRIMARY KEY,
    play_date DATE NOT NULL,
    user_id BIGINT REFERENCES users(id),
    guest_token_hash VARCHAR(64),
    who_am_i_attempt_id BIGINT REFERENCES minigame_attempts(id),
    grid_attempt_id BIGINT REFERENCES minigame_attempts(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_daily_runs_user_date UNIQUE (user_id, play_date),
    CONSTRAINT uk_daily_runs_guest_date UNIQUE (guest_token_hash, play_date)
);

CREATE INDEX idx_minigame_daily_runs_play_date ON minigame_daily_runs(play_date);
CREATE INDEX idx_minigame_daily_runs_status ON minigame_daily_runs(status);
