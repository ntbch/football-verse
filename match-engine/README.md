# Match Engine

Small Python service for football fixtures, standings, and later mini-manager simulation.

## Run

```powershell
$env:FOOTBALL_API_KEY="your-key"
python app.py
```

Without `FOOTBALL_API_KEY`, endpoints return mock Premier League data.

## Endpoints

- `GET /health`
- `GET /matches/premier-league/fixtures`
- `GET /standings/premier-league`
