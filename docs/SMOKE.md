# Smoke checks

Required services:

```powershell
docker compose up -d postgres redis match-game-postgres match-engine core-service game-service gateway-service web-client
```

Do not include `prediction-service` for Career smoke; Career uses `game-service`, `match_game_db`, and `match-engine`.

Run the API smoke:

```powershell
python scripts/career_smoke.py
```

Run a small balance report:

```powershell
python scripts/career_smoke.py --seasons 5
```

The script logs in, creates an eight-club Career, plays only managed-club fixtures, lets each response complete its AI matchday, and reports world fixture count alongside match/transfer/manager balance. It deletes the smoke save unless `--keep-save` is passed.
