from datetime import datetime, timezone

import config
from prediction import predictions_for_fixtures
from providers.client import api_get, football_data_get
from providers.normalizers import (
    map_fixture,
    map_football_data_match,
    map_football_data_standing,
    map_standing,
    normalize_fixtures,
)


def _get_provider():
    import football_api

    return getattr(football_api, "FOOTBALL_PROVIDER", config.FOOTBALL_PROVIDER)


def _get_mock_fixtures():
    import football_api

    return getattr(football_api, "MOCK_FIXTURES", config.MOCK_FIXTURES)


def league_id(slug):
    league = config.LEAGUES.get(slug)
    return league["id"] if league else None


def league_code(slug):
    league = config.LEAGUES.get(slug)
    return league["code"] if league else None


def leagues_payload():
    return {"leagues": [{"slug": slug, **league} for slug, league in config.LEAGUES.items()]}


def season_candidates(season):
    try:
        current = int(season)
    except ValueError:
        return [season]
    return [str(current - offset) for offset in range(5)]


def fixture_season_candidates(season):
    try:
        current = int(season)
    except ValueError:
        return [season]
    return [str(current + 1), str(current), str(current - 1), str(current - 2)]


def previous_season():
    try:
        return str(int(config.SEASON) - 1)
    except ValueError:
        return config.SEASON


def response_count(path, params):
    if _get_provider() == "football-data":
        return football_data_response_count(path, params)

    data = api_get(path, params)
    if data is None:
        return {"status": "mock", "count": None, "errors": []}
    return {
        "status": "api-football",
        "count": len(data.get("response", [])),
        "errors": data.get("errors", []),
    }


def football_data_response_count(path, params):
    league = config.LEAGUES["premier-league"]["code"]
    if path == "/fixtures/rounds":
        payload = football_data_matches(league)
        return {"status": "football-data", "count": len(football_data_rounds(payload)), "errors": []}
    if path == "/standings":
        payload = football_data_get(f"/competitions/{league}/standings", {"season": params.get("season", config.SEASON)})
        return {"status": "football-data", "count": len((payload or {}).get("standings", [])), "errors": []}

    payload = football_data_matches(league)
    matches = (payload or {}).get("matches", [])
    return {"status": "football-data", "count": len(matches), "errors": []}


def first_fixture_response(league, direction):
    for season in fixture_season_candidates(config.SEASON):
        data = api_get("/fixtures", {"league": league, "season": season, direction: "20"})
        if data is None:
            return None
        items = data.get("response", [])
        if items:
            return items

    data = api_get("/fixtures", {"league": league, direction: "20"})
    if data is None:
        return None
    return data.get("response", [])


def fixtures_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_fixtures_payload(league_slug)

    upcoming_items = first_fixture_response(selected_league_id, "next")
    history_items = first_fixture_response(selected_league_id, "last")
    if upcoming_items is None and history_items is None:
        return {"source": "mock", "league": league_slug, "fixtures": _get_mock_fixtures()}

    items = (upcoming_items or []) + (history_items or [])
    if not items:
        return {"source": "mock", "league": league_slug, "fixtures": _get_mock_fixtures()}
    fixtures = normalize_fixtures(items, map_fixture)
    return {"source": "api-football" if fixtures else "mock", "league": league_slug,
            "fixtures": fixtures or _get_mock_fixtures()}


def round_fixtures_payload(league_slug, round_name):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_round_fixtures_payload(league_slug, round_name)
    if not round_name:
        return fixtures_payload(league_slug)

    data = api_get("/fixtures", {"league": selected_league_id, "season": config.SEASON, "round": round_name})
    if data is None:
        return {"source": "mock", "league": league_slug, "fixtures": _get_mock_fixtures()}
    items = data.get("response", [])
    fixtures = normalize_fixtures(items, map_fixture)
    return {"source": "api-football" if fixtures else "mock", "league": league_slug,
            "fixtures": fixtures or _get_mock_fixtures()}


def live_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_live_payload(league_slug)

    data = api_get("/fixtures", {"league": selected_league_id, "live": "all"})
    if data is None:
        return {"source": "mock", "league": league_slug, "fixtures": []}
    return {"source": "api-football", "league": league_slug,
            "fixtures": normalize_fixtures(data.get("response", []), map_fixture)}


def rounds_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_rounds_payload(league_slug)

    data = api_get("/fixtures/rounds", {"league": selected_league_id, "season": config.SEASON})
    current = api_get("/fixtures/rounds", {"league": selected_league_id, "season": config.SEASON, "current": "true"})
    if data is None:
        return {"source": "mock", "league": league_slug, "currentRound": "Regular Season - 1", "rounds": ["Regular Season - 1"]}

    rounds = data.get("response", [])
    current_rounds = (current or {}).get("response", [])
    return {"source": "api-football", "league": league_slug, "currentRound": (current_rounds or rounds or [None])[0], "rounds": rounds}


def standings_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_standings_payload(league_slug)

    for season in season_candidates(config.SEASON):
        data = api_get("/standings", {"league": selected_league_id, "season": season})
        if data is None:
            return {"source": "mock", "league": league_slug, "standings": config.MOCK_STANDINGS}

        league = (data.get("response") or [{}])[0].get("league", {})
        rows = (league.get("standings") or [[]])[0]
        if rows:
            return {"source": "api-football", "league": league_slug, "season": season, "standings": [map_standing(row) for row in rows]}

    return {"source": "mock", "league": league_slug, "season": config.SEASON, "standings": config.MOCK_STANDINGS}


def predictions_payload(league_slug, round_name):
    fixtures = round_fixtures_payload(league_slug, round_name)
    if fixtures is None:
        return None
    all_fixtures = prediction_history(league_slug)
    return {
        "source": fixtures["source"],
        "league": league_slug,
        "round": round_name,
        "predictions": predictions_for_fixtures(fixtures["fixtures"], all_fixtures),
    }


def football_data_matches(league_code_value):
    return football_data_matches_for_season(league_code_value, config.SEASON)


def football_data_matches_for_season(league_code_value, season):
    return football_data_get(f"/competitions/{league_code_value}/matches", {"season": season})


def prediction_history(league_slug):
    base = (fixtures_payload(league_slug) or {}).get("fixtures", [])
    if _get_provider() != "football-data":
        return base

    code = league_code(league_slug)
    payload = football_data_matches_for_season(code, previous_season()) if code else None
    previous = normalize_fixtures((payload or {}).get("matches", []), map_football_data_match)
    return base + previous


def football_data_rounds(payload):
    matchdays = sorted({match.get("matchday") for match in (payload or {}).get("matches", []) if match.get("matchday")})
    return [f"Matchday {matchday}" for matchday in matchdays]


def football_data_fixtures_payload(league_slug):
    code = league_code(league_slug)
    if code is None:
        return None

    payload = football_data_matches(code)
    if payload is None:
        return {"source": "mock", "league": league_slug, "fixtures": _get_mock_fixtures()}
    fixtures = normalize_fixtures(payload.get("matches", []), map_football_data_match)
    return {"source": "football-data" if fixtures else "mock", "league": league_slug, "fixtures": fixtures or _get_mock_fixtures()}


def football_data_round_fixtures_payload(league_slug, round_name):
    payload = football_data_fixtures_payload(league_slug)
    if payload is None or not round_name:
        return payload

    fixtures = [fixture for fixture in payload["fixtures"] if fixture.get("round") == round_name]
    return {"source": payload["source"] if fixtures else "mock", "league": league_slug, "fixtures": fixtures or _get_mock_fixtures()}


def football_data_live_payload(league_slug):
    payload = football_data_fixtures_payload(league_slug)
    if payload is None:
        return None
    return {"source": payload["source"], "league": league_slug, "fixtures": [fixture for fixture in payload["fixtures"] if fixture["status"] == "live"]}


def football_data_rounds_payload(league_slug):
    code = league_code(league_slug)
    if code is None:
        return None

    payload = football_data_matches(code)
    if payload is None:
        return {"source": "mock", "league": league_slug, "currentRound": "Regular Season - 1", "rounds": ["Regular Season - 1"]}
    rounds = football_data_rounds(payload)
    current_round = football_data_current_round(payload, rounds)
    return {"source": "football-data", "league": league_slug, "currentRound": current_round, "rounds": rounds}


def football_data_current_round(payload, rounds):
    now = datetime.now(timezone.utc)
    upcoming = []
    for match in payload.get("matches", []):
        match_time = datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00"))
        if match_time >= now and match.get("matchday"):
            upcoming.append((match_time, f"Matchday {match['matchday']}"))
    if upcoming:
        return sorted(upcoming)[0][1]
    return None


def football_data_standings_payload(league_slug):
    code = league_code(league_slug)
    if code is None:
        return None

    for season in season_candidates(config.SEASON):
        payload = football_data_get(f"/competitions/{code}/standings", {"season": season})
        if payload is None:
            return {"source": "mock", "league": league_slug, "standings": config.MOCK_STANDINGS}
        rows = (payload.get("standings") or [{}])[0].get("table", [])
        if rows:
            return {"source": "football-data", "league": league_slug, "season": season, "standings": [map_football_data_standing(row) for row in rows]}
    return {"source": "mock", "league": league_slug, "standings": config.MOCK_STANDINGS}


def provider_debug_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None

    import football_api

    api_key = getattr(football_api, "API_KEY", config.API_KEY)
    provider = getattr(football_api, "FOOTBALL_PROVIDER", config.FOOTBALL_PROVIDER)

    return {
        "league": league_slug,
        "apiKeyLoaded": bool(api_key),
        "provider": provider,
        "season": config.SEASON,
        "checks": {
            "fixturesNext": response_count("/fixtures", {"league": selected_league_id, "season": config.SEASON, "next": "20"}),
            "fixturesLast": response_count("/fixtures", {"league": selected_league_id, "season": config.SEASON, "last": "20"}),
            "fixturesNoSeasonNext": response_count("/fixtures", {"league": selected_league_id, "next": "20"}),
            "fixturesNoSeasonLast": response_count("/fixtures", {"league": selected_league_id, "last": "20"}),
            "rounds": response_count("/fixtures/rounds", {"league": selected_league_id, "season": config.SEASON}),
            "standings": response_count("/standings", {"league": selected_league_id, "season": config.SEASON}),
        },
    }
