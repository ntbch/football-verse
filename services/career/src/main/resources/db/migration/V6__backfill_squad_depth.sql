CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH club_counts AS (
    SELECT c.id, c.career_save_id, c.name, c.reputation, count(p.id)::int AS player_count
    FROM clubs c
    LEFT JOIN players p ON p.club_id = c.id
    GROUP BY c.id, c.career_save_id, c.name, c.reputation
),
needed_players AS (
    SELECT club_counts.*, generate_series(1, greatest(0, 18 - player_count)) AS slot
    FROM club_counts
)
INSERT INTO players (id, career_save_id, club_id, name, primary_position, attributes)
SELECT
    gen_random_uuid(),
    career_save_id,
    id,
    name || ' Depth ' || slot,
    (ARRAY['GK','CB','CB','LB','RB','CM','CM','LW','RW','ST'])[((slot - 1) % 10) + 1],
    jsonb_build_object(
        'passing', reputation,
        'first_touch', reputation,
        'dribbling', reputation,
        'tackling', reputation,
        'finishing', reputation,
        'pace', reputation,
        'strength', reputation,
        'stamina', reputation,
        'aerial', reputation,
        'decisions', reputation,
        'positioning', reputation,
        'composure', reputation,
        'aggression', reputation,
        'teamwork', reputation,
        'handling', reputation,
        'reflexes', reputation,
        'one_on_one', reputation,
        'distribution', reputation
    )
FROM needed_players;
