ALTER TABLE fixtures ADD COLUMN scored_at timestamp(6) with time zone;

CREATE TABLE prediction_score_logs (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL REFERENCES user_predictions(id),
    fixture_id BIGINT NOT NULL REFERENCES fixtures(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    points INT NOT NULL,
    outcome_points INT NOT NULL DEFAULT 0,
    exact_score_points INT NOT NULL DEFAULT 0,
    ou25_points INT NOT NULL DEFAULT 0,
    btts_points INT NOT NULL DEFAULT 0,
    reason TEXT,
    scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_prediction_score_logs_user_id ON prediction_score_logs(user_id);
CREATE INDEX idx_prediction_score_logs_fixture_id ON prediction_score_logs(fixture_id);
CREATE INDEX idx_prediction_score_logs_prediction_id ON prediction_score_logs(prediction_id);

CREATE INDEX IF NOT EXISTS idx_fixtures_status_scored ON fixtures(status, scored);
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff);
