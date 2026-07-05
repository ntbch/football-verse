import football_api
import prediction


def test_status_name():
    assert football_api.status_name("NS") == "upcoming"
    assert football_api.status_name("1H") == "live"
    assert football_api.status_name("FT") == "result"


def test_map_fixture():
    item = {
        "fixture": {"id": 1, "date": "2026-08-15T14:00:00+00:00", "status": {"short": "NS"}},
        "league": {"name": "Premier League", "round": "Regular Season - 1"},
        "teams": {
            "home": {"id": 33, "name": "Manchester United", "logo": "home.png"},
            "away": {"id": 40, "name": "Liverpool", "logo": "away.png"},
        },
        "goals": {"home": None, "away": None},
    }

    fixture = football_api.map_fixture(item)

    assert fixture["id"] == "1"
    assert fixture["status"] == "upcoming"
    assert fixture["homeTeam"]["name"] == "Manchester United"


def test_prediction_for_fixture():
    fixture = {
        "id": "mock-1",
        "league": "Premier League",
        "round": "Regular Season - 1",
        "status": "upcoming",
        "kickoff": "2026-08-15T14:00:00+00:00",
        "homeTeam": {"id": "33", "name": "Manchester United", "logo": ""},
        "awayTeam": {"id": "40", "name": "Liverpool", "logo": ""},
        "score": {"home": None, "away": None},
    }

    result = prediction.prediction_for_fixture(fixture)

    assert sum(result["probabilities"].values()) == 100
    assert result["pick"] in {"home", "draw", "away"}
    assert len(result["form"]["home"]) == 5


def test_season_candidates():
    assert football_api.season_candidates("2026") == ["2026", "2025", "2024", "2023", "2022"]
    assert football_api.season_candidates("bad") == ["bad"]
    assert football_api.fixture_season_candidates("2025") == ["2026", "2025", "2024", "2023"]
    assert football_api.previous_season() == "2025"
