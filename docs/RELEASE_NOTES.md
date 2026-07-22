# Release notes

## Career V1

- Career dashboard is split into Overview, Fixtures, Squad, Table, and History.
- Match Centre has timeline filters, team stat comparison, and player ratings.
- Saves can be renamed and deleted.
- Balance/smoke script lives at `scripts/career_smoke.py`.
- Career data is isolated in `match_game_db`; `prediction-service` is not part of the Career game loop.
