class ProviderPayloadError(ValueError):
    pass


def _required(mapping, key, context):
    if not isinstance(mapping, dict) or key not in mapping or mapping[key] is None:
        raise ProviderPayloadError(f"Missing {context}.{key}")
    return mapping[key]


def status_name(short_status):
    if short_status in {"NS", "TBD"}:
        return "upcoming"
    if short_status in {"1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"}:
        return "live"
    return "result"


def football_data_status_name(status):
    if status in {"SCHEDULED", "TIMED", "POSTPONED"}:
        return "upcoming"
    if status in {"IN_PLAY", "PAUSED"}:
        return "live"
    return "result"


def map_fixture(item):
    try:
        fixture = _required(item, "fixture", "fixture")
        teams = _required(item, "teams", "fixture")
        goals = _required(item, "goals", "fixture")
        league = _required(item, "league", "fixture")
        fixture_id = _required(fixture, "id", "fixture")
        home = _required(teams, "home", "teams")
        away = _required(teams, "away", "teams")
        home_id = _required(home, "id", "homeTeam")
        away_id = _required(away, "id", "awayTeam")
        short_status = _required(_required(fixture, "status", "fixture"), "short", "fixture.status")
    except (KeyError, TypeError) as error:
        raise ProviderPayloadError("Invalid api-football fixture payload") from error

    return {
        "id": str(fixture_id),
        "provider": "api-football",
        "providerFixtureId": str(fixture_id),
        "league": _required(league, "name", "league"),
        "round": league.get("round"),
        "status": status_name(short_status),
        "kickoff": _required(fixture, "date", "fixture"),
        "homeTeam": {
            "id": str(home_id),
            "name": _required(home, "name", "homeTeam"),
            "logo": home.get("logo"),
        },
        "awayTeam": {
            "id": str(away_id),
            "name": _required(away, "name", "awayTeam"),
            "logo": away.get("logo"),
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
    try:
        fixture_id = _required(item, "id", "match")
        home = _required(item, "homeTeam", "match")
        away = _required(item, "awayTeam", "match")
        score = item.get("score") or {}
    except (KeyError, TypeError) as error:
        raise ProviderPayloadError("Invalid football-data fixture payload") from error
    return {
        "id": str(fixture_id),
        "provider": "football-data",
        "providerFixtureId": str(fixture_id),
        "league": "Premier League",
        "round": f"Matchday {item.get('matchday')}",
        "status": football_data_status_name(_required(item, "status", "match")),
        "kickoff": _required(item, "utcDate", "match"),
        "homeTeam": {
            "id": str(_required(home, "id", "homeTeam")),
            "name": _required(home, "name", "homeTeam"),
            "logo": home.get("crest"),
        },
        "awayTeam": {
            "id": str(_required(away, "id", "awayTeam")),
            "name": _required(away, "name", "awayTeam"),
            "logo": away.get("crest"),
        },
        "score": {
            "home": (score.get("fullTime") or {}).get("home"),
            "away": (score.get("fullTime") or {}).get("away"),
        },
    }


def normalize_fixtures(items, mapper):
    normalized = {}
    for item in items if isinstance(items, list) else []:
        try:
            fixture = mapper(item)
            normalized[fixture["id"]] = fixture
        except (ProviderPayloadError, KeyError, TypeError, ValueError):
            continue
    return list(normalized.values())


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
