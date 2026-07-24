ALTER TABLE fixtures ADD COLUMN matchday_number INTEGER NOT NULL DEFAULT 1;

WITH numbered AS (
    SELECT id, row_number() OVER (PARTITION BY career_save_id, season_number ORDER BY match_date, id) AS value
    FROM fixtures
)
UPDATE fixtures f SET matchday_number=n.value FROM numbered n WHERE n.id=f.id;

CREATE INDEX idx_fixtures_matchday ON fixtures(career_save_id, season_number, matchday_number, status);
