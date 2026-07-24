CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_players_name_trgm
    ON players USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clubs_name_trgm
    ON clubs USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_players_career_club_position
    ON players (career_save_id, club_id, primary_position, id);

CREATE INDEX IF NOT EXISTS idx_transfer_offers_career_buyer_updated
    ON transfer_offers (career_save_id, buyer_club_id, updated_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_transfer_offers_career_seller_updated
    ON transfer_offers (career_save_id, seller_club_id, updated_at DESC, id);
