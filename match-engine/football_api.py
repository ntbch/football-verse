import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from datetime import datetime, timezone

from config import API_BASE_URL, API_KEY, FOOTBALL_DATA_BASE_URL, FOOTBALL_PROVIDER, LEAGUES, MOCK_FIXTURES, MOCK_STANDINGS, SEASON
from prediction import predictions_for_fixtures

FOOTBALL_DATA_CACHE = {}


def api_get(path, params):
    if not API_KEY:
        return None

    url = f"{API_BASE_URL}{path}?{urlencode(params)}"
    request = Request(url, headers={"x-apisports-key": API_KEY})
    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError):
        return None


def football_data_get(path, params=None):
    if not API_KEY:
        return None

    key = (path, tuple(sorted((params or {}).items())))
    if key in FOOTBALL_DATA_CACHE:
        return FOOTBALL_DATA_CACHE[key]

    suffix = f"?{urlencode(params)}" if params else ""
    request = Request(f"{FOOTBALL_DATA_BASE_URL}{path}{suffix}", headers={"X-Auth-Token": API_KEY})
    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
            FOOTBALL_DATA_CACHE[key] = payload
            return payload
    except (HTTPError, URLError, TimeoutError):
        return None


def response_count(path, params):
    if FOOTBALL_PROVIDER == "football-data":
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
    league = LEAGUES["premier-league"]["code"]
    if path == "/fixtures/rounds":
        payload = football_data_matches(league)
        return {"status": "football-data", "count": len(football_data_rounds(payload)), "errors": []}
    if path == "/standings":
        payload = football_data_get(f"/competitions/{league}/standings", {"season": params.get("season", SEASON)})
        return {"status": "football-data", "count": len((payload or {}).get("standings", [])), "errors": []}

    payload = football_data_matches(league)
    matches = (payload or {}).get("matches", [])
    return {"status": "football-data", "count": len(matches), "errors": []}


def status_name(short_status):
    if short_status in {"NS", "TBD"}:
        return "upcoming"
    if short_status in {"1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"}:
        return "live"
    return "result"


def map_fixture(item):
    fixture = item["fixture"]
    teams = item["teams"]
    goals = item["goals"]
    league = item["league"]

    return {
        "id": str(fixture["id"]),
        "league": league["name"],
        "round": league.get("round"),
        "status": status_name(fixture["status"]["short"]),
        "kickoff": fixture["date"],
        "homeTeam": {
            "id": str(teams["home"]["id"]),
            "name": teams["home"]["name"],
            "logo": teams["home"].get("logo"),
        },
        "awayTeam": {
            "id": str(teams["away"]["id"]),
            "name": teams["away"]["name"],
            "logo": teams["away"].get("logo"),
        },
        "score": {"home": goals["home"], "away": goals["away"]},
    }


def map_standing(row):
    return {
        "rank": row["rank"],
        "team": {
            "id": str(row["team"]["id"]),
            "name": row["team"]["name"],
            "logo": row["team"].get("logo"),
        },
        "points": row["points"],
        "played": row["all"]["played"],
    }


def map_football_data_match(item):
    return {
        "id": str(item["id"]),
        "league": "Premier League",
        "round": f"Matchday {item.get('matchday')}",
        "status": football_data_status_name(item["status"]),
        "kickoff": item["utcDate"],
        "homeTeam": {
            "id": str(item["homeTeam"]["id"]),
            "name": item["homeTeam"]["name"],
            "logo": item["homeTeam"].get("crest"),
        },
        "awayTeam": {
            "id": str(item["awayTeam"]["id"]),
            "name": item["awayTeam"]["name"],
            "logo": item["awayTeam"].get("crest"),
        },
        "score": {
            "home": item.get("score", {}).get("fullTime", {}).get("home"),
            "away": item.get("score", {}).get("fullTime", {}).get("away"),
        },
    }


def football_data_status_name(status):
    if status in {"SCHEDULED", "TIMED", "POSTPONED"}:
        return "upcoming"
    if status in {"IN_PLAY", "PAUSED"}:
        return "live"
    return "result"


def map_football_data_standing(row):
    return {
        "rank": row["position"],
        "team": {
            "id": str(row["team"]["id"]),
            "name": row["team"]["name"],
            "logo": row["team"].get("crest"),
        },
        "points": row["points"],
        "played": row["playedGames"],
    }


def league_id(slug):
    league = LEAGUES.get(slug)
    return league["id"] if league else None


def leagues_payload():
    return {"leagues": [{"slug": slug, **league} for slug, league in LEAGUES.items()]}


def fixtures_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if FOOTBALL_PROVIDER == "football-data":
        return football_data_fixtures_payload(league_slug)

    upcoming_items = first_fixture_response(selected_league_id, "next")
    history_items = first_fixture_response(selected_league_id, "last")
    if upcoming_items is None and history_items is None:
        return {"source": "mock", "league": league_slug, "fixtures": MOCK_FIXTURES}

    items = (upcoming_items or []) + (history_items or [])
    if not items:
        return {"source": "mock", "league": league_slug, "fixtures": MOCK_FIXTURES}
    fixtures = {str(item["fixture"]["id"]): map_fixture(item) for item in items}
    return {"source": "api-football", "league": league_slug, "fixtures": list(fixtures.values())}


def first_fixture_response(league, direction):
    for season in fixture_season_candidates(SEASON):
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


def round_fixtures_payload(league_slug, round_name):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if FOOTBALL_PROVIDER == "football-data":
        return football_data_round_fixtures_payload(league_slug, round_name)
    if not round_name:
        return fixtures_payload(league_slug)

    data = api_get("/fixtures", {"league": selected_league_id, "season": SEASON, "round": round_name})
    if data is None:
        return {"source": "mock", "league": league_slug, "fixtures": MOCK_FIXTURES}
    items = data.get("response", [])
    return {"source": "api-football" if items else "mock", "league": league_slug, "fixtures": [map_fixture(item) for item in items] or MOCK_FIXTURES}


def live_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if FOOTBALL_PROVIDER == "football-data":
        return football_data_live_payload(league_slug)

    data = api_get("/fixtures", {"league": selected_league_id, "live": "all"})
    if data is None:
        return {"source": "mock", "league": league_slug, "fixtures": []}
    return {"source": "api-football", "league": league_slug, "fixtures": [map_fixture(item) for item in data.get("response", [])]}


def rounds_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if FOOTBALL_PROVIDER == "football-data":
        return football_data_rounds_payload(league_slug)

    data = api_get("/fixtures/rounds", {"league": selected_league_id, "season": SEASON})
    current = api_get("/fixtures/rounds", {"league": selected_league_id, "season": SEASON, "current": "true"})
    if data is None:
        return {"source": "mock", "league": league_slug, "currentRound": "Regular Season - 1", "rounds": ["Regular Season - 1"]}

    rounds = data.get("response", [])
    current_rounds = (current or {}).get("response", [])
    return {"source": "api-football", "league": league_slug, "currentRound": (current_rounds or rounds or [None])[0], "rounds": rounds}


def standings_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None
    if FOOTBALL_PROVIDER == "football-data":
        return football_data_standings_payload(league_slug)

    for season in season_candidates(SEASON):
        data = api_get("/standings", {"league": selected_league_id, "season": season})
        if data is None:
            return {"source": "mock", "league": league_slug, "standings": MOCK_STANDINGS}

        league = (data.get("response") or [{}])[0].get("league", {})
        rows = (league.get("standings") or [[]])[0]
        if rows:
            return {"source": "api-football", "league": league_slug, "season": season, "standings": [map_standing(row) for row in rows]}

    return {"source": "mock", "league": league_slug, "season": SEASON, "standings": MOCK_STANDINGS}


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


def league_code(slug):
    league = LEAGUES.get(slug)
    return league["code"] if league else None


def football_data_matches(league_code_value):
    return football_data_matches_for_season(league_code_value, SEASON)


def football_data_matches_for_season(league_code_value, season):
    return football_data_get(f"/competitions/{league_code_value}/matches", {"season": season})


def previous_season():
    try:
        return str(int(SEASON) - 1)
    except ValueError:
        return SEASON


def prediction_history(league_slug):
    base = (fixtures_payload(league_slug) or {}).get("fixtures", [])
    if FOOTBALL_PROVIDER != "football-data":
        return base

    code = league_code(league_slug)
    payload = football_data_matches_for_season(code, previous_season()) if code else None
    previous = [map_football_data_match(item) for item in (payload or {}).get("matches", [])]
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
        return {"source": "mock", "league": league_slug, "fixtures": MOCK_FIXTURES}
    fixtures = [map_football_data_match(item) for item in payload.get("matches", [])]
    return {"source": "football-data" if fixtures else "mock", "league": league_slug, "fixtures": fixtures or MOCK_FIXTURES}


def football_data_round_fixtures_payload(league_slug, round_name):
    payload = football_data_fixtures_payload(league_slug)
    if payload is None or not round_name:
        return payload

    fixtures = [fixture for fixture in payload["fixtures"] if fixture.get("round") == round_name]
    return {"source": payload["source"] if fixtures else "mock", "league": league_slug, "fixtures": fixtures or MOCK_FIXTURES}


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

    for season in season_candidates(SEASON):
        payload = football_data_get(f"/competitions/{code}/standings", {"season": season})
        if payload is None:
            return {"source": "mock", "league": league_slug, "standings": MOCK_STANDINGS}
        rows = (payload.get("standings") or [{}])[0].get("table", [])
        if rows:
            return {"source": "football-data", "league": league_slug, "season": season, "standings": [map_football_data_standing(row) for row in rows]}
    return {"source": "mock", "league": league_slug, "standings": MOCK_STANDINGS}


def provider_debug_payload(league_slug):
    selected_league_id = league_id(league_slug)
    if selected_league_id is None:
        return None

    return {
        "league": league_slug,
        "apiKeyLoaded": bool(API_KEY),
        "provider": FOOTBALL_PROVIDER,
        "season": SEASON,
        "checks": {
            "fixturesNext": response_count("/fixtures", {"league": selected_league_id, "season": SEASON, "next": "20"}),
            "fixturesLast": response_count("/fixtures", {"league": selected_league_id, "season": SEASON, "last": "20"}),
            "fixturesNoSeasonNext": response_count("/fixtures", {"league": selected_league_id, "next": "20"}),
            "fixturesNoSeasonLast": response_count("/fixtures", {"league": selected_league_id, "last": "20"}),
            "rounds": response_count("/fixtures/rounds", {"league": selected_league_id, "season": SEASON}),
            "standings": response_count("/standings", {"league": selected_league_id, "season": SEASON}),
        },
    }
