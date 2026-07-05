"""Prediction engine.

Computes probabilities, pick, score, markets and form from actual recent match history
rather than deterministic seeds. Falls back to a benign prior when no history is available.

ponytail: simple Poisson-style model from observed goal rates. No ML. Replace with xG
model or trained classifier when history volume justifies it.
"""

AVERAGE_LEAGUE_GOALS = 2.7
DREW_FACTOR = 0.28  # rough share of draws in PL


def team_seed(team):
    return sum(ord(char) for char in f"{team['id']}:{team['name']}")


def clamp(value, low, high):
    return max(low, min(high, value))


def fixture_history(fixture, all_fixtures):
    """Last 5 finished matches for each team (any opponent)."""
    home_id = str(fixture["homeTeam"].get("id", ""))
    away_id = str(fixture["awayTeam"].get("id", ""))
    home, away = [], []
    for item in all_fixtures:
        if item.get("status") != "result":
            continue
        ht = str(item["homeTeam"].get("id", ""))
        at = str(item["awayTeam"].get("id", ""))
        if ht == home_id or at == home_id:
            home.append(item)
        if ht == away_id or at == away_id:
            away.append(item)
    home.sort(key=lambda f: f["kickoff"], reverse=True)
    away.sort(key=lambda f: f["kickoff"], reverse=True)
    return home[:5], away[:5]


def form_marks(history, team_id):
    """W/D/L string for the last 5 matches from team_id's perspective."""
    marks = []
    for item in history:
        ht = str(item["homeTeam"].get("id", ""))
        home_goals = item.get("score", {}).get("home") or 0
        away_goals = item.get("score", {}).get("away") or 0
        if ht == team_id:
            own, opp = home_goals, away_goals
        else:
            own, opp = away_goals, home_goals
        if own > opp:
            marks.append("W")
        elif own == opp:
            marks.append("D")
        else:
            marks.append("L")
    while len(marks) < 5:
        marks.append("-")
    return marks


def expected_goals(history, team_id):
    """Average goals scored per match."""
    if not history:
        return AVERAGE_LEAGUE_GOALS / 2
    total = 0
    for item in history:
        ht = str(item["homeTeam"].get("id", ""))
        if ht == team_id:
            total += item.get("score", {}).get("home") or 0
        else:
            total += item.get("score", {}).get("away") or 0
    return total / len(history)


def match_outcome_probabilities(home_xg, away_xg):
    """Poisson-derived 1X2 probabilities from expected goals."""
    p_home = poisson_win(home_xg, away_xg)
    p_away = poisson_win(away_xg, home_xg)
    p_draw = clamp(1.0 - p_home - p_away, 0.05, 0.40)
    total = p_home + p_away + p_draw
    return {
        "home": round(p_home * 100 / total),
        "draw": round(p_draw * 100 / total),
        "away": round(p_away * 100 / total),
    }


def poisson_win(lambda_home, lambda_away, cap=8):
    """P(home goals > away goals) via Poisson pmf up to `cap` goals."""
    pmf_home = [poisson_pmf(lambda_home, k) for k in range(cap + 1)]
    pmf_away = [poisson_pmf(lambda_away, k) for k in range(cap + 1)]
    win = 0.0
    for h in range(cap + 1):
        for a in range(h):
            win += pmf_home[h] * pmf_away[a]
    return clamp(win, 0.05, 0.85)


def poisson_pmf(lam, k):
    """Poisson probability mass at k via recurrence."""
    from math import exp
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    p = exp(-lam)
    for i in range(1, k + 1):
        p = p * lam / i
    return p


def correct_score(pick, goals):
    """Most likely scoreline for the pick given total expected goals."""
    if pick == "draw":
        score = 1 if goals < 3 else 2
        return score, score
    if pick == "home":
        return (2, 1) if goals < 3 else (3, 1)
    return (1, 2) if goals < 3 else (1, 3)


def pick_label(fixture, pick):
    if pick == "home":
        return fixture["homeTeam"]["name"]
    if pick == "away":
        return fixture["awayTeam"]["name"]
    return "Draw"


def trend_text(fixture, pick, goals):
    side = pick_label(fixture, pick)
    total = "open game" if goals >= 2.5 else "tight game"
    return f"{side} edge, {total}"


def prediction_for_fixture(fixture, all_fixtures=None):
    all_fixtures = all_fixtures or []
    home_history, away_history = fixture_history(fixture, all_fixtures)

    home_id = str(fixture["homeTeam"].get("id", ""))
    away_id = str(fixture["awayTeam"].get("id", ""))

    home_xg = expected_goals(home_history, home_id)
    away_xg = expected_goals(away_history, away_id)
    goals = round(clamp(home_xg + away_xg, 1.0, 6.0), 1)

    probabilities = match_outcome_probabilities(home_xg, away_xg)
    # normalize remainder away
    probabilities["away"] = 100 - probabilities["home"] - probabilities["draw"]

    pick = max(probabilities, key=probabilities.get)
    home_goals, away_goals = correct_score(pick, goals)

    has_history = bool(home_history and away_history)
    home_form = form_marks(home_history, home_id) if has_history else form_marks_seed(home_id)
    away_form = form_marks(away_history, away_id) if has_history else form_marks_seed(away_id)

    return {
        "fixture": fixture,
        "probabilities": probabilities,
        "pick": pick,
        "pickLabel": pick_label(fixture, pick),
        "correctScore": f"{home_goals}-{away_goals}",
        "averageGoals": goals,
        "confidence": probabilities[pick],
        "markets": {
            "oneXTwo": pick,
            "overUnder25": "over" if goals >= 2.5 else "under",
            "bothTeamsToScore": "yes" if home_xg >= 0.8 and away_xg >= 0.8 else "no",
        },
        "form": {"home": home_form, "away": away_form},
        "trend": trend_text(fixture, pick, goals),
    }


def form_marks_seed(team_id):
    """Fallback W/D/L when no history exists (deterministic but labeled)."""
    seed = sum(ord(c) for c in str(team_id))
    marks = ["W", "D", "L"]
    return [marks[(seed + i) % len(marks)] for i in range(5)]


def predictions_for_fixtures(fixtures, all_fixtures=None):
    return [prediction_for_fixture(f, all_fixtures or fixtures) for f in fixtures]
