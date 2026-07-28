from datetime import datetime, timedelta, timezone

import config
from prediction import prediction_for_fixture, predictions_for_fixtures
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


def league_id(slug):
    league = config.LEAGUES.get(slug)
    return league["id"] if league else None


def league_code(slug):
    league = config.LEAGUES.get(slug)
    return league["code"] if league else None


def leagues_payload():
    return {"leagues": [{"slug": slug, **league} for slug, league in config.LEAGUES.items()]}


def _availability(state, provider=None, season=None, source_updated_at=None, retry_after_seconds=None):
    return {
        "state": state,
        "provider": provider or _get_provider(),
        "season": season,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUpdatedAt": source_updated_at,
        "retryAfterSeconds": retry_after_seconds,
    }


def _payload(league_slug, resource, value, state, season=None, provider=None, source_updated_at=None):
    active_provider = provider or _get_provider()
    return {
        "source": active_provider,
        "league": league_slug,
        resource: value,
        "availability": _availability(state, active_provider, season, source_updated_at, 30 if state == "PROVIDER_UNAVAILABLE" else None),
    }


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
        return {"status": "provider_unavailable", "count": None, "errors": []}
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
        return _payload(league_slug, "fixtures", [], "PROVIDER_UNAVAILABLE")

    items = (upcoming_items or []) + (history_items or [])
    fixtures = normalize_fixtures(items, map_fixture)
    return _payload(league_slug, "fixtures", fixtures, "AVAILABLE" if fixtures else "NO_DATA", provider="api-football")


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
        return _payload(league_slug, "fixtures", [], "PROVIDER_UNAVAILABLE")
    items = data.get("response", [])
    fixtures = normalize_fixtures(items, map_fixture)
    return _payload(league_slug, "fixtures", fixtures, "AVAILABLE" if fixtures else "NO_DATA", provider="api-football")


def live_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_live_payload(league_slug)

    data = api_get("/fixtures", {"league": selected_league_id, "live": "all"})
    if data is None:
        return _payload(league_slug, "fixtures", [], "PROVIDER_UNAVAILABLE")
    fixtures = normalize_fixtures(data.get("response", []), map_fixture)
    return _payload(league_slug, "fixtures", fixtures, "AVAILABLE" if fixtures else "NO_DATA", provider="api-football")


def fixture_detail_payload(league_slug, fixture_id):
    if league_id(league_slug) is None:
        return None

    fixtures = fixtures_payload(league_slug)
    if fixtures is None:
        return None
    fixture = next((item for item in fixtures.get("fixtures", []) if item.get("id") == fixture_id), None)
    if fixture is None:
        return None

    return {
        "source": fixtures.get("source", "unknown"),
        "league": league_slug,
        "fixture": fixture,
        "lineups": lineup_payload(fixture),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def fixture_prediction_payload(league_slug, fixture_id):
    detail = fixture_detail_payload(league_slug, fixture_id)
    if detail is None:
        return None
    fixture = detail["fixture"]
    if _get_provider() == "football-data":
        home_id = fixture["homeTeam"].get("id")
        away_id = fixture["awayTeam"].get("id")
        home_history = football_data_team_history(home_id)
        away_history = football_data_team_history(away_id)
        if home_history is None or away_history is None:
            return _payload(league_slug, "prediction", None, "PROVIDER_UNAVAILABLE", config.SEASON, "football-data")
        prediction = prediction_for_fixture(
            fixture,
            team_histories={str(home_id): home_history, str(away_id): away_history},
        )
    else:
        prediction = prediction_for_fixture(fixture, prediction_history(league_slug))
    return _payload(
        league_slug,
        "prediction",
        prediction,
        "AVAILABLE" if prediction else "NO_DATA",
        config.SEASON,
        detail.get("source"),
    )


def football_data_team_history(team_id):
    if not team_id:
        return None
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=420)
    payload = football_data_get(
        f"/teams/{team_id}/matches",
        {"dateFrom": start.isoformat(), "dateTo": end.isoformat()},
    )
    if payload is None:
        return None
    return normalize_fixtures(payload.get("matches", []), map_football_data_match)


def lineup_payload(fixture):
    fetched_at = datetime.now(timezone.utc).isoformat()
    if _get_provider() != "api-football":
        return {
            "coverage": "UNSUPPORTED_COMPETITION",
            "sourceUpdatedAt": None,
            "fetchedAt": fetched_at,
            "teams": [],
        }

    payload = api_get("/fixtures/lineups", {"fixture": fixture["providerFixtureId"]})
    if payload is None:
        return {
            "coverage": "PROVIDER_UNAVAILABLE",
            "sourceUpdatedAt": None,
            "fetchedAt": fetched_at,
            "teams": [],
        }

    lineups = payload.get("response", [])
    if not lineups:
        return {
            "coverage": "AWAITING_OFFICIAL",
            "sourceUpdatedAt": None,
            "fetchedAt": fetched_at,
            "teams": [],
        }

    teams = [team for lineup in lineups if (team := _map_lineup_team(lineup)) is not None]
    if not teams:
        return {
            "coverage": "PROVIDER_UNAVAILABLE",
            "sourceUpdatedAt": None,
            "fetchedAt": fetched_at,
            "teams": [],
        }

    return {
        "coverage": "PUBLISHED",
        "sourceUpdatedAt": fetched_at,
        "fetchedAt": fetched_at,
        "teams": teams,
    }


def _map_lineup_team(lineup):
    team = lineup.get("team") or {}
    if not team.get("id") or not team.get("name"):
        return None

    def players(entries):
        result = []
        for entry in entries or []:
            player = entry.get("player") or {}
            if not player.get("name"):
                continue
            result.append({
                "id": str(player.get("id", "")),
                "name": player["name"],
                "number": player.get("number"),
                "position": player.get("pos"),
            })
        return result

    return {
        "teamId": str(team.get("id", "")),
        "teamName": team["name"],
        "teamLogo": team.get("logo"),
        "formation": lineup.get("formation"),
        "startingXI": players(lineup.get("startXI")),
        "substitutes": players(lineup.get("substitutes")),
    }


def rounds_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_rounds_payload(league_slug)

    data = api_get("/fixtures/rounds", {"league": selected_league_id, "season": config.SEASON})
    current = api_get("/fixtures/rounds", {"league": selected_league_id, "season": config.SEASON, "current": "true"})
    if data is None:
        payload = _payload(league_slug, "rounds", [], "PROVIDER_UNAVAILABLE")
        payload["currentRound"] = None
        return payload

    rounds = data.get("response", [])
    current_rounds = (current or {}).get("response", [])
    payload = _payload(league_slug, "rounds", rounds, "AVAILABLE" if rounds else "NO_DATA", provider="api-football")
    payload["currentRound"] = (current_rounds or rounds or [None])[0]
    return payload


def standings_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if _get_provider() == "football-data":
        return football_data_standings_payload(league_slug)

    for season in season_candidates(config.SEASON):
        data = api_get("/standings", {"league": selected_league_id, "season": season})
        if data is None:
            return _payload(league_slug, "standings", [], "PROVIDER_UNAVAILABLE", season)

        league = (data.get("response") or [{}])[0].get("league", {})
        rows = (league.get("standings") or [[]])[0]
        if rows:
            return _payload(league_slug, "standings", [map_standing(row) for row in rows], "AVAILABLE", season, "api-football")

    return _payload(league_slug, "standings", [], "NO_DATA", config.SEASON, "api-football")


def predictions_payload(league_slug, round_name):
    fixtures = round_fixtures_payload(league_slug, round_name)
    if fixtures is None:
        return None
    all_fixtures = prediction_history(league_slug)
    payload = _payload(
        league_slug,
        "predictions",
        predictions_for_fixtures(fixtures["fixtures"], all_fixtures),
        fixtures.get("availability", {}).get("state", "PROVIDER_UNAVAILABLE"),
        fixtures.get("availability", {}).get("season"),
        fixtures.get("source"),
    )
    payload["round"] = round_name
    return payload


def football_data_matches(league_code_value):
    return football_data_matches_for_season(league_code_value, config.SEASON)


def football_data_matches_for_season(league_code_value, season):
    return football_data_get(f"/competitions/{league_code_value}/matches", {"season": season})


def prediction_history(league_slug):
    base = (fixtures_payload(league_slug) or {}).get("fixtures", [])
    if _get_provider() == "api-football":
        selected_league_id = league_id(league_slug)
        if selected_league_id is None:
            return base
        history = []
        for season in (config.SEASON, previous_season()):
            payload = api_get("/fixtures", {"league": selected_league_id, "season": season, "status": "FT"})
            if payload is not None:
                history.extend(normalize_fixtures(payload.get("response", []), map_fixture))
        return history
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
        return _payload(league_slug, "fixtures", [], "PROVIDER_UNAVAILABLE", provider="football-data")
    fixtures = normalize_fixtures(payload.get("matches", []), map_football_data_match)
    return _payload(league_slug, "fixtures", fixtures, "AVAILABLE" if fixtures else "NO_DATA", provider="football-data")


def football_data_round_fixtures_payload(league_slug, round_name):
    payload = football_data_fixtures_payload(league_slug)
    if payload is None or not round_name:
        return payload

    fixtures = [fixture for fixture in payload["fixtures"] if fixture.get("round") == round_name]
    state = payload.get("availability", {}).get("state", "PROVIDER_UNAVAILABLE")
    if state == "AVAILABLE" and not fixtures:
        state = "NO_DATA"
    return _payload(league_slug, "fixtures", fixtures, state, provider=payload.get("source"))


def football_data_live_payload(league_slug):
    payload = football_data_fixtures_payload(league_slug)
    if payload is None:
        return None
    fixtures = [fixture for fixture in payload["fixtures"] if fixture["status"] == "live"]
    state = payload.get("availability", {}).get("state", "PROVIDER_UNAVAILABLE")
    if state == "AVAILABLE" and not fixtures:
        state = "NO_DATA"
    return _payload(league_slug, "fixtures", fixtures, state, provider=payload.get("source"))


def football_data_rounds_payload(league_slug):
    code = league_code(league_slug)
    if code is None:
        return None

    payload = football_data_matches(code)
    if payload is None:
        result = _payload(league_slug, "rounds", [], "PROVIDER_UNAVAILABLE", provider="football-data")
        result["currentRound"] = None
        return result
    rounds = football_data_rounds(payload)
    current_round = football_data_current_round(payload, rounds)
    result = _payload(league_slug, "rounds", rounds, "AVAILABLE" if rounds else "NO_DATA", provider="football-data")
    result["currentRound"] = current_round
    return result


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
            return _payload(league_slug, "standings", [], "PROVIDER_UNAVAILABLE", season, "football-data")
        rows = (payload.get("standings") or [{}])[0].get("table", [])
        if rows:
            return _payload(league_slug, "standings", [map_football_data_standing(row) for row in rows], "AVAILABLE", season, "football-data")
    return _payload(league_slug, "standings", [], "NO_DATA", config.SEASON, "football-data")


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
