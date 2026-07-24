CREATE TABLE managers (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age BETWEEN 25 AND 80),
    reputation INTEGER NOT NULL CHECK (reputation BETWEEN 1 AND 100),
    status VARCHAR(30) NOT NULL CHECK (status IN ('EMPLOYED', 'UNEMPLOYED', 'RETIRED')),
    current_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    preferred_tactic VARCHAR(30) NOT NULL,
    tactical INTEGER NOT NULL CHECK (tactical BETWEEN 1 AND 100),
    adaptability INTEGER NOT NULL CHECK (adaptability BETWEEN 1 AND 100),
    rotation INTEGER NOT NULL CHECK (rotation BETWEEN 1 AND 100),
    youth INTEGER NOT NULL CHECK (youth BETWEEN 1 AND 100),
    discipline INTEGER NOT NULL CHECK (discipline BETWEEN 1 AND 100),
    transfer_rating INTEGER NOT NULL CHECK (transfer_rating BETWEEN 1 AND 100),
    risk INTEGER NOT NULL CHECK (risk BETWEEN 1 AND 100),
    board_pressure INTEGER NOT NULL DEFAULT 20 CHECK (board_pressure BETWEEN 0 AND 100),
    matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_active_manager_club ON managers(current_club_id) WHERE current_club_id IS NOT NULL;

CREATE TABLE manager_careers (
    id UUID PRIMARY KEY,
    manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id),
    joined_on DATE NOT NULL,
    left_on DATE,
    matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    trophies INTEGER NOT NULL DEFAULT 0,
    dismissal_reason VARCHAR(200)
);
CREATE UNIQUE INDEX uq_active_manager_career ON manager_careers(manager_id) WHERE left_on IS NULL;

CREATE TABLE manager_objectives (
    id UUID PRIMARY KEY,
    manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id),
    season_number INTEGER NOT NULL,
    objective_type VARCHAR(30) NOT NULL,
    target INTEGER NOT NULL,
    weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 100),
    progress INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    UNIQUE(manager_id, season_number, objective_type)
);

CREATE TABLE manager_decisions (
    id BIGSERIAL PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    game_date DATE NOT NULL,
    domain VARCHAR(30) NOT NULL,
    decision_code VARCHAR(50) NOT NULL,
    reason JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_manager_decisions_recent ON manager_decisions(manager_id, game_date DESC);

ALTER TABLE career_saves ADD COLUMN player_manager_id UUID REFERENCES managers(id) ON DELETE SET NULL;

INSERT INTO managers(id, career_save_id, name, age, reputation, status, current_club_id, preferred_tactic,
                     tactical, adaptability, rotation, youth, discipline, transfer_rating, risk)
SELECT gen_random_uuid(), c.career_save_id, c.name || ' Manager', 42, c.reputation, 'EMPLOYED', c.id,
       c.preferred_tactic, c.reputation, 55, 55, 55, 55, 55, 55
FROM clubs c;

INSERT INTO manager_careers(id, manager_id, club_id, joined_on)
SELECT gen_random_uuid(), m.id, m.current_club_id, s.game_date
FROM managers m JOIN career_saves s ON s.id=m.career_save_id WHERE m.current_club_id IS NOT NULL;

INSERT INTO manager_objectives(id, manager_id, club_id, season_number, objective_type, target, weight)
SELECT gen_random_uuid(), m.id, m.current_club_id, s.season_number, 'POINTS', 8, 70
FROM managers m JOIN career_saves s ON s.id=m.career_save_id WHERE m.current_club_id IS NOT NULL;

UPDATE career_saves s SET player_manager_id=(
    SELECT m.id FROM managers m WHERE m.current_club_id=s.managed_club_id LIMIT 1
);
