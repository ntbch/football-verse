ALTER TABLE career_saves ADD COLUMN managed_club_id UUID;
ALTER TABLE clubs ADD COLUMN wage_budget NUMERIC(19,2) NOT NULL DEFAULT 250000;
ALTER TABLE players ADD COLUMN wage NUMERIC(19,2) NOT NULL DEFAULT 10000;
ALTER TABLE players ADD COLUMN contract_until DATE;
ALTER TABLE players ADD COLUMN squad_role VARCHAR(30) NOT NULL DEFAULT 'SQUAD';
ALTER TABLE players ADD COLUMN transfer_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE';

UPDATE career_saves s SET managed_club_id = (
    SELECT c.id FROM clubs c WHERE c.career_save_id = s.id ORDER BY c.name LIMIT 1
);
UPDATE players p SET contract_until = s.game_date + INTERVAL '730 days'
FROM career_saves s WHERE p.career_save_id = s.id;

ALTER TABLE career_saves ADD CONSTRAINT fk_career_managed_club FOREIGN KEY (managed_club_id) REFERENCES clubs(id) ON DELETE SET NULL;
ALTER TABLE players ALTER COLUMN contract_until SET NOT NULL;
ALTER TABLE players ADD CONSTRAINT ck_player_transfer_status CHECK (transfer_status IN ('AVAILABLE', 'LISTED', 'NOT_FOR_SALE', 'REQUESTED'));

CREATE TABLE transfer_offers (
    id UUID PRIMARY KEY,
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    buyer_club_id UUID NOT NULL REFERENCES clubs(id),
    seller_club_id UUID NOT NULL REFERENCES clubs(id),
    player_id UUID NOT NULL REFERENCES players(id),
    fee NUMERIC(19,2) NOT NULL CHECK (fee > 0),
    wage NUMERIC(19,2),
    contract_years INTEGER,
    squad_role VARCHAR(30),
    status VARCHAR(30) NOT NULL,
    negotiation_round INTEGER NOT NULL DEFAULT 1 CHECK (negotiation_round BETWEEN 1 AND 3),
    expires_on DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (buyer_club_id <> seller_club_id)
);
CREATE INDEX idx_transfer_offers_clubs ON transfer_offers(career_save_id, buyer_club_id, seller_club_id, status);

CREATE TABLE scouting_reports (
    career_save_id UUID NOT NULL REFERENCES career_saves(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 25 CHECK (progress BETWEEN 0 AND 100),
    last_scouted_on DATE NOT NULL,
    PRIMARY KEY (career_save_id, club_id, player_id)
);
