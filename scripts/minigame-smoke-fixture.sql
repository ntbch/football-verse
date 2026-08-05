BEGIN;

DELETE FROM minigame_attempts
WHERE challenge_id IN (
    SELECT id FROM minigame_challenges
    WHERE play_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
);
DELETE FROM minigame_challenges
WHERE play_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
DELETE FROM minigame_players WHERE provider = 'ESPN';

INSERT INTO minigame_players (
    id, provider, provider_player_id, name, normalized_name, aliases, nationality, position,
    birth_year, current_club, current_league, career_clubs, season_label,
    season_appearances, season_goals, season_assists, trophy_count, refreshed_at
) VALUES
    (900001, 'ESPN', 900001, 'Smoke Mystery', 'smoke mystery', '[]', 'England', 'Forward',
     1999, 'Alpha FC', 'Smoke League', '["Alpha FC","Beta FC"]', '2026', 30, 10, 5, 1, CURRENT_TIMESTAMP),
    (900002, 'ESPN', 900002, 'Smoke England Alpha', 'smoke england alpha', '[]', 'England', 'Midfielder',
     1998, 'Alpha FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900003, 'ESPN', 900003, 'Smoke England Beta', 'smoke england beta', '[]', 'England', 'Midfielder',
     1997, 'Beta FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900004, 'ESPN', 900004, 'Smoke England Gamma', 'smoke england gamma', '[]', 'England', 'Midfielder',
     1996, 'Gamma FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900005, 'ESPN', 900005, 'Smoke France Alpha', 'smoke france alpha', '[]', 'France', 'Midfielder',
     1998, 'Alpha FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900006, 'ESPN', 900006, 'Smoke France Beta', 'smoke france beta', '[]', 'France', 'Midfielder',
     1997, 'Beta FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900007, 'ESPN', 900007, 'Smoke France Gamma', 'smoke france gamma', '[]', 'France', 'Midfielder',
     1996, 'Gamma FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900008, 'ESPN', 900008, 'Smoke Spain Alpha', 'smoke spain alpha', '[]', 'Spain', 'Midfielder',
     1998, 'Alpha FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900009, 'ESPN', 900009, 'Smoke Spain Beta', 'smoke spain beta', '[]', 'Spain', 'Midfielder',
     1997, 'Beta FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP),
    (900010, 'ESPN', 900010, 'Smoke Spain Gamma', 'smoke spain gamma', '[]', 'Spain', 'Midfielder',
     1996, 'Gamma FC', 'Smoke League', '["Alpha FC","Beta FC","Gamma FC"]', NULL, 20, 2, 3, 0, CURRENT_TIMESTAMP);

INSERT INTO minigame_challenges (id, play_date, game_type, public_payload, answer_payload, created_at)
VALUES
    (910001, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'WHO_AM_I',
     '{"kind":"who-am-i","maxGuesses":3,"initialClues":2,"clues":["I represent England and play as a Forward.","My career has included Alpha FC and Beta FC.","My current league season is 2026.","I have 1 recorded trophy wins.","I have played for 2 clubs in this catalog."]}',
     '{"answerId":900001,"answerName":"Smoke Mystery","comparison":{"nationality":"England","position":"Forward","currentClub":"Alpha FC","currentLeague":"Smoke League","birthYear":1999,"careerClubCount":2,"trophyCount":1}}',
     CURRENT_TIMESTAMP),
    (910002, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'GRID',
     '{"kind":"grid","rows":["England","France","Spain"],"columns":["Alpha FC","Beta FC","Gamma FC"],"maxGuesses":9}',
     '{"validByCell":{"England|Alpha FC":[900002],"England|Beta FC":[900003],"England|Gamma FC":[900004],"France|Alpha FC":[900005],"France|Beta FC":[900006],"France|Gamma FC":[900007],"Spain|Alpha FC":[900008],"Spain|Beta FC":[900009],"Spain|Gamma FC":[900010]}}',
     CURRENT_TIMESTAMP);

COMMIT;
