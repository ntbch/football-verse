import hmac
import sys

from fastapi import Depends, FastAPI, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGIN, INTERNAL_TOKEN
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

# Setup CORS. A wildcard origin can never be combined with credentials;
# this service serves GET-only public data, so wildcard mode disables
# credentials instead of reflecting arbitrary origins.
_wildcard_origin = CORS_ORIGIN.strip() == "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard_origin else [CORS_ORIGIN],
    allow_credentials=not _wildcard_origin,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

if sys.version_info >= (3, 14):
    import warnings

    warnings.warn(
        "Python 3.14+ is unsupported for local runs: the pinned dependency set "
        "(pydantic==2.10.4) ships no wheels for it and production images run "
        "Python 3.12. Prefer Docker or a 3.12/3.13 virtualenv.",
        stacklevel=1,
    )

def get_league_payload(payload):
    if payload is None:
        raise HTTPException(status_code=404, detail="League not found")
    availability = payload.get("availability") if isinstance(payload, dict) else None
    if availability and availability.get("state") == "PROVIDER_UNAVAILABLE":
        raise HTTPException(status_code=503, detail={"code": "PROVIDER_UNAVAILABLE"})
    return payload


def require_internal_token(x_internal_token: str | None = Header(default=None)):
    if not INTERNAL_TOKEN or not x_internal_token or not hmac.compare_digest(x_internal_token, INTERNAL_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

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
def get_debug(league_slug: str, _: None = Depends(require_internal_token)):
    return get_league_payload(provider_debug_payload(league_slug))
