import argparse
import json
import time
from datetime import date
from urllib.error import HTTPError
from urllib.request import Request, urlopen


PRESETS = {
    "BALANCED": {"mentality": "BALANCED", "tempo": "NORMAL", "width": "NORMAL", "passing_style": "MIXED", "pressing": "STANDARD", "defensive_line": "STANDARD", "transition": "BALANCED", "time_wasting": "OFF"},
    "GEGENPRESS": {"mentality": "ATTACKING", "tempo": "FAST", "width": "NORMAL", "passing_style": "SHORT", "pressing": "HIGH", "defensive_line": "HIGH", "transition": "COUNTER", "time_wasting": "OFF"},
    "TIKI_TAKA": {"mentality": "POSITIVE", "tempo": "SLOW", "width": "NARROW", "passing_style": "SHORT", "pressing": "STANDARD", "defensive_line": "HIGH", "transition": "HOLD_SHAPE", "time_wasting": "OFF"},
    "COUNTER_ATTACK": {"mentality": "CAUTIOUS", "tempo": "FAST", "width": "NORMAL", "passing_style": "DIRECT", "pressing": "LOW", "defensive_line": "LOW", "transition": "COUNTER", "time_wasting": "MODERATE"},
    "PARK_THE_BUS": {"mentality": "DEFENSIVE", "tempo": "SLOW", "width": "NARROW", "passing_style": "DIRECT", "pressing": "LOW", "defensive_line": "LOW", "transition": "HOLD_SHAPE", "time_wasting": "HIGH"},
    "DIRECT_LONG_BALL": {"mentality": "POSITIVE", "tempo": "FAST", "width": "NORMAL", "passing_style": "DIRECT", "pressing": "STANDARD", "defensive_line": "STANDARD", "transition": "COUNTER", "time_wasting": "OFF"},
    "WING_PLAY": {"mentality": "POSITIVE", "tempo": "FAST", "width": "WIDE", "passing_style": "MIXED", "pressing": "STANDARD", "defensive_line": "STANDARD", "transition": "BALANCED", "time_wasting": "OFF"},
}


def call(method, url, token=None, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=30) as response:
            if response.status == 204:
                return None
            body = json.loads(response.read().decode())
            return body.get("data") if isinstance(body, dict) and "data" in body and "success" in body else body
    except HTTPError as error:
        raise SystemExit(f"{method} {url} -> {error.code}: {error.read().decode()}") from error


def main():
    parser = argparse.ArgumentParser(description="Career API smoke + balance report")
    parser.add_argument("--base", default="http://localhost:8000")
    parser.add_argument("--email", default="admin@footballverse.local")
    parser.add_argument("--password", default="ChangeMe123!")
    parser.add_argument("--seasons", type=int, default=1)
    parser.add_argument("--keep-save", action="store_true")
    args = parser.parse_args()

    token = call("POST", f"{args.base}/api/v1/auth/login", payload={"email": args.email, "password": args.password})["accessToken"]
    save = call("POST", f"{args.base}/game/saves", token, {"name": f"Smoke {int(time.time())}"})
    save_id = save["id"]
    matches, goals, cards, injuries, spreads, last_match, matchups = 0, 0, 0, 0, [], None, {}
    try:
        call("PATCH", f"{args.base}/game/saves/{save_id}", token, {"name": "Smoke Career"})
        call("POST", f"{args.base}/game/saves/{save_id}/training-focus", token, {"focus": "FITNESS"})
        initial = call("GET", f"{args.base}/game/saves/{save_id}", token)
        managed_club = initial["save"]["managedClubId"]
        squad = call("GET", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/squad", token)
        call("PATCH", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/players/{squad[0]['id']}/transfer-status", token, {"status": "LISTED"})
        call("PATCH", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/players/{squad[0]['id']}/transfer-status", token, {"status": "AVAILABLE"})
        market = call("GET", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/market", token)
        if market["players"]:
            call("POST", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/scouting/{market['players'][0]['playerId']}", token, {})

        for season in range(args.seasons):
            while True:
                career = call("GET", f"{args.base}/game/saves/{save_id}", token)
                managed = career["save"].get("managedClubId")
                scheduled = [item for item in career["fixtures"] if item["status"] == "SCHEDULED"
                             and managed in (item["homeClubId"], item["awayClubId"])]
                if not scheduled:
                    break
                fixture = scheduled[0]
                while date.fromisoformat(career["save"]["gameDate"]) < date.fromisoformat(fixture["matchDate"]):
                    call("POST", f"{args.base}/game/saves/{save_id}/advance-day", token, {})
                    career = call("GET", f"{args.base}/game/saves/{save_id}", token)
                preset = list(PRESETS)[matches % len(PRESETS)]
                played = call("POST", f"{args.base}/game/saves/{save_id}/fixtures/{fixture['id']}/play", token,
                              {"seed": matches, "homeTactic": PRESETS[preset]})
                result = played["result"]
                last_match = played["matchId"]
                matches += 1
                goals += result["home_score"] + result["away_score"]
                cards += sum(1 for event in result["events"] if "CARD" in event["type"])
                injuries += sum(1 for event in result["events"] if event["type"] == "INJURY")
                row = matchups.setdefault(preset, {"matches": 0, "goals": 0, "xg": 0, "shots": 0})
                row["matches"] += 1
                row["goals"] += result["home_score"]
                row["xg"] += result["stats"]["home"]["xg"]
                row["shots"] += result["stats"]["home"]["shots"]

            career = call("GET", f"{args.base}/game/saves/{save_id}", token)
            table = (career.get("seasonSummary") or {}).get("finalTable") or []
            if table:
                points = [club["points"] for club in table]
                spreads.append(max(points) - min(points))
            if season + 1 < args.seasons:
                call("POST", f"{args.base}/game/saves/{save_id}/next-season", token, {})

        transfer_offers = []
        career = call("GET", f"{args.base}/game/saves/{save_id}", token)
        managed_club = career["save"].get("managedClubId")
        if managed_club:
            transfer_offers = call("GET", f"{args.base}/game/saves/{save_id}/clubs/{managed_club}/offers", token)
        manager = call("GET", f"{args.base}/game/saves/{save_id}/manager", token)
        manager_jobs = call("GET", f"{args.base}/game/saves/{save_id}/jobs", token)
        manager_decisions = call("GET", f"{args.base}/game/saves/{save_id}/manager/decisions", token)
        if last_match:
            call("GET", f"{args.base}/game/saves/{save_id}/matches/{last_match}", token)
        print(json.dumps({
            "saveId": save_id,
            "seasons": args.seasons,
            "matches": matches,
            "worldFixturesPlayed": sum(1 for fixture in career["fixtures"] if fixture["status"] == "PLAYED"),
            "goalsPerMatch": round(goals / max(1, matches), 2),
            "cardsPerMatch": round(cards / max(1, matches), 2),
            "injuriesPerMatch": round(injuries / max(1, matches), 2),
            "avgTableSpread": round(sum(spreads) / max(1, len(spreads)), 2),
            "presetMatchups": {name: {
                "matches": row["matches"],
                "goalsPerMatch": round(row["goals"] / row["matches"], 2),
                "xgPerMatch": round(row["xg"] / row["matches"], 2),
                "shotsPerMatch": round(row["shots"] / row["matches"], 2),
            } for name, row in matchups.items()},
            "transfersCompleted": sum(1 for offer in transfer_offers if offer["status"] == "COMPLETED"),
            "transferSpend": sum(offer["fee"] for offer in transfer_offers if offer["status"] == "COMPLETED" and offer["buyerClubId"] == managed_club),
            "failedOffers": sum(1 for offer in transfer_offers if offer["status"] in ("REJECTED", "EXPIRED")),
            "managerPressure": manager["boardPressure"],
            "managerRecord": {"matches": manager["matches"], "wins": manager["wins"], "draws": manager["draws"], "losses": manager["losses"]},
            "managerDecisions": len(manager_decisions),
            "managerVacancies": sum(1 for job in manager_jobs if job["status"] == "VACANT"),
            "lastMatchUrl": f"{args.base}/matches?saveId={save_id}&matchId={last_match}" if last_match else None,
        }, indent=2))
    finally:
        if not args.keep_save:
            call("DELETE", f"{args.base}/game/saves/{save_id}", token)


if __name__ == "__main__":
    main()
