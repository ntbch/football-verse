ALTER TABLE fixtures DROP CONSTRAINT fixtures_home_club_id_fkey,
    ADD CONSTRAINT fixtures_home_club_id_fkey FOREIGN KEY (home_club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE fixtures DROP CONSTRAINT fixtures_away_club_id_fkey,
    ADD CONSTRAINT fixtures_away_club_id_fkey FOREIGN KEY (away_club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE matches DROP CONSTRAINT matches_fixture_id_fkey,
    ADD CONSTRAINT matches_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE;

ALTER TABLE transfer_offers DROP CONSTRAINT transfer_offers_buyer_club_id_fkey,
    ADD CONSTRAINT transfer_offers_buyer_club_id_fkey FOREIGN KEY (buyer_club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE transfer_offers DROP CONSTRAINT transfer_offers_seller_club_id_fkey,
    ADD CONSTRAINT transfer_offers_seller_club_id_fkey FOREIGN KEY (seller_club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE transfer_offers DROP CONSTRAINT transfer_offers_player_id_fkey,
    ADD CONSTRAINT transfer_offers_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE scouting_reports DROP CONSTRAINT scouting_reports_club_id_fkey,
    ADD CONSTRAINT scouting_reports_club_id_fkey FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;

ALTER TABLE manager_careers DROP CONSTRAINT manager_careers_club_id_fkey,
    ADD CONSTRAINT manager_careers_club_id_fkey FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE manager_objectives DROP CONSTRAINT manager_objectives_club_id_fkey,
    ADD CONSTRAINT manager_objectives_club_id_fkey FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;
