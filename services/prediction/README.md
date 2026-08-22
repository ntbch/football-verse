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

Without `FOOTBALL_API_KEY`, provider-backed endpoints return an explicit unavailable state; they never return mock football data.

### Supported Python versions

Production images run **Python 3.12** (see `Dockerfile`). The pinned
dependency set — `pydantic==2.10.4` in particular, via `pydantic-core` —
ships no wheels for Python >= 3.14, so a local virtualenv on those
versions cannot even install the requirements. For local work use:

- Docker (`docker compose build prediction-service`), or
- a Python 3.12/3.13 virtualenv.

Running the module on an unsupported interpreter emits a warning; pip
installs fail earlier with a wheel-build error for the same reason.

## Endpoints

- `GET /health`
- `GET /leagues`
- `GET /matches/premier-league/rounds`
- `GET /matches/premier-league/fixtures`
- `GET /matches/premier-league/fixtures?round=Regular%20Season%20-%201`
- `GET /matches/premier-league/live`
- `GET /predictions/premier-league?round=Regular%20Season%20-%201`
- `GET /standings/premier-league`
