"""Prediction engine built only from completed provider-sourced matches.

ponytail: a small Poisson model is enough while there is no validated xG model.
Upgrade only when a measured model can beat this one on held-out provider data.
"""


def clamp(value, low, high):
    return max(low, min(high, value))


def fixture_history(fixture, all_fixtures):
    """The five most recent completed matches for each team."""
    home_id = str(fixture["homeTeam"].get("id", ""))
    away_id = str(fixture["awayTeam"].get("id", ""))
    home, away = [], []
    for item in all_fixtures:
        if item.get("status") != "result":
            continue
        score = item.get("score") or {}
        if score.get("home") is None or score.get("away") is None:
            continue
        home_team = str(item["homeTeam"].get("id", ""))
        away_team = str(item["awayTeam"].get("id", ""))
        if home_team == home_id or away_team == home_id:
            home.append(item)
        if home_team == away_id or away_team == away_id:
            away.append(item)
    home.sort(key=lambda item: item["kickoff"], reverse=True)
    away.sort(key=lambda item: item["kickoff"], reverse=True)
    return home[:5], away[:5]


def completed_history(fixtures):
    matches = [
        fixture for fixture in fixtures
        if fixture.get("status") == "result"
        and (fixture.get("score") or {}).get("home") is not None
        and (fixture.get("score") or {}).get("away") is not None
    ]
    return sorted(matches, key=lambda fixture: fixture["kickoff"], reverse=True)[:5]


def form_marks(history, team_id):
    marks = []
    for item in history:
        home_team = str(item["homeTeam"].get("id", ""))
        home_goals = item["score"]["home"]
        away_goals = item["score"]["away"]
        own, opponent = (home_goals, away_goals) if home_team == team_id else (away_goals, home_goals)
        marks.append("W" if own > opponent else "D" if own == opponent else "L")
    return marks


def expected_goals(history, team_id):
    total = 0
    for item in history:
        total += item["score"]["home"] if str(item["homeTeam"].get("id", "")) == team_id else item["score"]["away"]
    return total / len(history)


def poisson_pmf(lam, value):
    from math import exp

    probability = exp(-lam)
    for index in range(1, value + 1):
        probability = probability * lam / index
    return probability


def poisson_win(home_goals, away_goals, cap=8):
    home = [poisson_pmf(home_goals, score) for score in range(cap + 1)]
    away = [poisson_pmf(away_goals, score) for score in range(cap + 1)]
    return clamp(sum(home[home_score] * away[away_score] for home_score in range(cap + 1) for away_score in range(home_score)), 0.05, 0.85)


def match_outcome_probabilities(home_goals, away_goals):
    home = poisson_win(home_goals, away_goals)
    away = poisson_win(away_goals, home_goals)
    draw = clamp(1.0 - home - away, 0.05, 0.40)
    total = home + draw + away
    probabilities = {"home": round(home * 100 / total), "draw": round(draw * 100 / total)}
    probabilities["away"] = 100 - probabilities["home"] - probabilities["draw"]
    return probabilities


def pick_label(fixture, pick):
    if pick == "home":
        return fixture["homeTeam"]["name"]
    if pick == "away":
        return fixture["awayTeam"]["name"]
    return "Draw"


def prediction_for_fixture(fixture, all_fixtures=None, team_histories=None):
    all_fixtures = all_fixtures or []
    home_id = str(fixture["homeTeam"].get("id", ""))
    away_id = str(fixture["awayTeam"].get("id", ""))
    if team_histories is None:
        home_history, away_history = fixture_history(fixture, all_fixtures)
    else:
        home_history = completed_history(team_histories.get(home_id, []))
        away_history = completed_history(team_histories.get(away_id, []))
    if len(home_history) < 5 or len(away_history) < 5:
        return None
    home_goals = expected_goals(home_history, home_id)
    away_goals = expected_goals(away_history, away_id)
    average_goals = round(home_goals + away_goals, 1)
    probabilities = match_outcome_probabilities(home_goals, away_goals)
    pick = max(probabilities, key=probabilities.get)
    source_updated_at = max(item["kickoff"] for item in home_history + away_history)

    return {
        "fixture": fixture,
        "probabilities": probabilities,
        "pick": pick,
        "pickLabel": pick_label(fixture, pick),
        "averageGoals": average_goals,
        "confidence": probabilities[pick],
        "markets": {
            "oneXTwo": pick,
            "overUnder25": "over" if average_goals >= 2.5 else "under",
            "bothTeamsToScore": "yes" if home_goals >= 0.8 and away_goals >= 0.8 else "no",
        },
        "form": {"home": form_marks(home_history, home_id), "away": form_marks(away_history, away_id)},
        "sampleSize": 5,
        "sourceUpdatedAt": source_updated_at,
    }


def predictions_for_fixtures(fixtures, all_fixtures=None):
    return [prediction for fixture in fixtures if (prediction := prediction_for_fixture(fixture, all_fixtures or fixtures)) is not None]
