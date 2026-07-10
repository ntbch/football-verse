ALTER TABLE career_saves ADD COLUMN season_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE fixtures ADD COLUMN season_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_fixtures_career_season_date ON fixtures(career_save_id, season_number, match_date);

CREATE TABLE season_records (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    champion_club_id UUID NOT NULL,
    champion_club_name VARCHAR(100) NOT NULL,
    final_table JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (career_save_id, season_number)
);
