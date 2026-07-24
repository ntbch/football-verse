import pytest
from fastapi import HTTPException
from urllib.error import HTTPError
import json

from app import get_league_payload, health
import football_api
from providers import client
from providers.normalizers import map_football_data_match, normalize_fixtures
from prediction import prediction_for_fixture


def fixture():
    return {
        "id": "fixture-1",
        "kickoff": "2026-08-01T15:00:00Z",
        "status": "scheduled",
        "homeTeam": {"id": "home", "name": "Home"},
        "awayTeam": {"id": "away", "name": "Away"},
    }


def test_health_and_unknown_league():
    assert health() == {"status": "ok"}
    with pytest.raises(HTTPException) as error:
        get_league_payload(None)
    assert error.value.status_code == 404


def test_prediction_is_deterministic_and_normalized():
    first = prediction_for_fixture(fixture())
    second = prediction_for_fixture(fixture())

    assert first == second
    assert sum(first["probabilities"].values()) == 100


def test_allowed_leagues_and_mock_fixture_fallback(monkeypatch):
    monkeypatch.setattr(football_api, "FOOTBALL_PROVIDER", "api-football")
    monkeypatch.setattr(football_api, "API_KEY", "")
    monkeypatch.setattr(football_api, "MOCK_FIXTURES", [fixture()])

    catalog = football_api.leagues_payload()
    payload = football_api.round_fixtures_payload("premier-league", None)

    assert [league["slug"] for league in catalog["leagues"]] == ["premier-league"]
    assert payload == {"source": "mock", "league": "premier-league", "fixtures": [fixture()]}


def test_provider_http_error_maps_to_unavailable(monkeypatch):
    monkeypatch.setattr(football_api, "API_KEY", "test-key")

    def fail_request(*_args, **_kwargs):
        raise HTTPError("https://provider.example.test", 503, "Unavailable", {}, None)

    monkeypatch.setattr(football_api, "urlopen", fail_request)

    assert football_api.api_get("/fixtures", {"league": "39"}) is None


class ProviderResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def football_data_match(status="TIMED", kickoff="2026-08-01T15:00:00Z", score=None):
    return {
        "id": 42,
        "utcDate": kickoff,
        "status": status,
        "matchday": 1,
        "homeTeam": {"id": 1, "name": "Home", "crest": None},
        "awayTeam": {"id": 2, "name": "Away", "crest": None},
        "score": {"fullTime": score or {"home": None, "away": None}},
    }


def test_provider_identity_survives_reschedule_and_corrected_result():
    scheduled = football_data_match()
    corrected = football_data_match(
        status="FINISHED",
        kickoff="2026-08-02T17:30:00Z",
        score={"home": 2, "away": 1},
    )

    fixtures = normalize_fixtures([scheduled, corrected], map_football_data_match)

    assert len(fixtures) == 1
    assert fixtures[0]["id"] == "42"
    assert fixtures[0]["provider"] == "football-data"
    assert fixtures[0]["providerFixtureId"] == "42"
    assert fixtures[0]["kickoff"] == "2026-08-02T17:30:00Z"
    assert fixtures[0]["status"] == "result"
    assert fixtures[0]["score"] == {"home": 2, "away": 1}


def test_invalid_provider_items_are_skipped_without_poisoning_batch():
    valid = football_data_match()
    invalid = {"id": 99, "status": "TIMED"}

    fixtures = normalize_fixtures([invalid, valid, None], map_football_data_match)

    assert [item["id"] for item in fixtures] == ["42"]


def test_football_data_cache_is_ttl_bounded_and_serves_stale_on_outage(monkeypatch):
    monkeypatch.setattr(football_api, "API_KEY", "test-key")
    client.FOOTBALL_DATA_CACHE.clear()
    timestamp = 100.0
    monkeypatch.setattr(client.time, "monotonic", lambda: timestamp)
    calls = 0

    def provider(_request, timeout):
        nonlocal calls
        calls += 1
        assert timeout == 12
        if calls > 1:
            raise TimeoutError("provider timeout")
        return ProviderResponse({"matches": [football_data_match()]})

    monkeypatch.setattr(football_api, "urlopen", provider)
    first = football_api.football_data_get("/competitions/PL/matches", {"season": "2026"})
    cached = football_api.football_data_get("/competitions/PL/matches", {"season": "2026"})
    assert first == cached
    assert calls == 1

    timestamp += client.CACHE_TTL_SECONDS + 1
    stale = football_api.football_data_get("/competitions/PL/matches", {"season": "2026"})
    assert stale == first
    assert calls == 2


def test_non_object_provider_payload_maps_to_unavailable(monkeypatch):
    monkeypatch.setattr(football_api, "API_KEY", "test-key")
    monkeypatch.setattr(football_api, "urlopen", lambda *_args, **_kwargs: ProviderResponse(["invalid"]))

    assert football_api.api_get("/fixtures", {"league": "39"}) is None
