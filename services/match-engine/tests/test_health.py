from fastapi.testclient import TestClient
from uuid import uuid4

from match_engine import main
from match_engine.domain import MatchInput, MatchSimulationState
from tests.test_domain import team


client = TestClient(main.app)


def test_health_reports_ready():
    response = main.health()

    assert response == {"status": "ok", "service": "match-engine"}


def test_simulate_endpoint_uses_engine():
    match = MatchInput(seed=7, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))

    result = main.simulate_match(match)

    assert result.seed == 7
    assert result.home_team_id == match.home.id


def test_session_api_runs_match_in_segments():
    match = MatchInput(seed=8, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))
    payload = match.model_dump(mode="json")

    response = client.post("/session/start", json={"match": payload})
    assert response.status_code == 200
    state = response.json()

    response = client.post("/session/advance", json={"match": payload, "state": state, "target_minute": 90})
    assert response.status_code == 200
    state = response.json()
    assert MatchSimulationState.model_validate(state).completed

    response = client.post("/session/finish", json={"match": payload, "state": state})
    assert response.status_code == 200
    assert response.json()["seed"] == 8


def test_session_advance_rejects_target_minute_outside_match():
    match = MatchInput(seed=9, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))
    payload = match.model_dump(mode="json")
    state = client.post("/session/start", json={"match": payload}).json()

    assert client.post("/session/advance", json={"match": payload, "state": state, "target_minute": 0}).status_code == 422
    assert client.post("/session/advance", json={"match": payload, "state": state, "target_minute": 91}).status_code == 422


def test_session_commands_change_tactic_and_lineup():
    home = team("Home")
    substitute = home.players[1].model_copy(update={"id": uuid4(), "name": "Home Substitute"})
    home = home.model_copy(update={
        "players": (*home.players, substitute),
        "lineup": home.lineup.model_copy(update={"bench": (substitute.id,)}),
    })
    match = MatchInput(seed=10, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))
    payload = match.model_dump(mode="json")
    state = client.post("/session/start", json={"match": payload}).json()

    changed = client.post("/session/command", json={"match": payload, "state": state, "command": {
        "type": "SHOUT", "team_id": str(match.home.id), "shout": "DEMAND_MORE"
    }}).json()
    assert changed["current_home"]["tactic"]["mentality"] == "ATTACKING"

    outgoing = payload["home"]["lineup"]["starters"][1]["player_id"]
    incoming = payload["home"]["lineup"]["bench"][0]
    changed = client.post("/session/command", json={"match": payload, "state": changed, "command": {
        "type": "SUBSTITUTION", "team_id": str(match.home.id),
        "outgoing_player_id": outgoing, "incoming_player_id": incoming
    }}).json()
    assert incoming in {slot["player_id"] for slot in changed["current_home"]["lineup"]["starters"]}
    assert changed["events"][-1]["type"] == "SUBSTITUTION"
