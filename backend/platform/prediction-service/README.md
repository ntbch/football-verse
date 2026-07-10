# Prediction Service

Small Python service for fetching real-world football fixtures, standings, and calculating match predictions.

Currently allowed leagues:

- `premier-league`

## Run

```powershell
$env:FOOTBALL_API_KEY="your-key"
python app.py
```

Terminal will keep running while the HTTP server is alive.

Without `FOOTBALL_API_KEY`, endpoints return mock Premier League data.

## Endpoints

- `GET /health`
- `GET /leagues`
- `GET /matches/premier-league/rounds`
- `GET /matches/premier-league/fixtures`
- `GET /matches/premier-league/fixtures?round=Regular%20Season%20-%201`
- `GET /matches/premier-league/live`
- `GET /predictions/premier-league?round=Regular%20Season%20-%201`
- `GET /standings/premier-league`
