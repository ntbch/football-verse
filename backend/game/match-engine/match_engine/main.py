from fastapi import FastAPI

from match_engine.domain import MatchInput, MatchResult
from match_engine.engine import simulate


app = FastAPI(title="Football Verse Match Engine")


@app.get("/health")
def health():
    return {"status": "ok", "service": "match-engine"}


@app.post("/simulate", response_model=MatchResult)
def simulate_match(match: MatchInput):
    return simulate(match)
