from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGIN
from football_api import (
    leagues_payload,
    fixture_detail_payload,
    fixture_prediction_payload,
    live_payload,
    provider_debug_payload,
    predictions_payload,
    round_fixtures_payload,
    rounds_payload,
    standings_payload,
)

app = FastAPI(title="Football Verse Prediction Service")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

def get_league_payload(payload):
    if payload is None:
        raise HTTPException(status_code=404, detail="League not found")
    availability = payload.get("availability") if isinstance(payload, dict) else None
    if availability and availability.get("state") == "PROVIDER_UNAVAILABLE":
        raise HTTPException(status_code=503, detail={"code": "PROVIDER_UNAVAILABLE"})
    return payload

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/leagues")
def get_leagues():
    return leagues_payload()

@app.get("/matches/{league_slug}/rounds")
def get_rounds(league_slug: str):
    return get_league_payload(rounds_payload(league_slug))

@app.get("/matches/{league_slug}/live")
def get_live(league_slug: str):
    return get_league_payload(live_payload(league_slug))

@app.get("/matches/{league_slug}/fixtures")
def get_fixtures(league_slug: str, round: str | None = Query(default=None)):
    return get_league_payload(round_fixtures_payload(league_slug, round))

@app.get("/matches/{league_slug}/fixtures/{fixture_id}")
def get_fixture_detail(league_slug: str, fixture_id: str):
    return get_league_payload(fixture_detail_payload(league_slug, fixture_id))

@app.get("/predictions/{league_slug}/fixtures/{fixture_id}")
def get_fixture_prediction(league_slug: str, fixture_id: str):
    return get_league_payload(fixture_prediction_payload(league_slug, fixture_id))

@app.get("/predictions/{league_slug}")
def get_predictions(league_slug: str, round: str | None = Query(default=None)):
    return get_league_payload(predictions_payload(league_slug, round))

@app.get("/standings/{league_slug}")
def get_standings(league_slug: str):
    return get_league_payload(standings_payload(league_slug))

@app.get("/debug/{league_slug}")
def get_debug(league_slug: str):
    return get_league_payload(provider_debug_payload(league_slug))
