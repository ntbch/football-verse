import argparse
import json
import os
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import quote


class SmokeFailure(RuntimeError):
    pass


def request(method, url, token=None, payload=None, timeout=15, return_headers=False, cookie=None, origin=None, extra_headers=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if cookie:
        headers["Cookie"] = cookie
    if origin:
        headers["Origin"] = origin
    if extra_headers:
        headers.update(extra_headers)

    try:
        with urlopen(Request(url, data=body, headers=headers, method=method), timeout=timeout) as response:
            raw = response.read()
            if not raw:
                result = None
                return (result, response.headers) if return_headers else result
            parsed = json.loads(raw.decode("utf-8"))
            if isinstance(parsed, dict) and "success" in parsed and "data" in parsed:
                if not parsed["success"]:
                    raise SmokeFailure(f"{method} {url}: unsuccessful response")
                result = parsed["data"]
            else:
                result = parsed
            return (result, response.headers) if return_headers else result
    except HTTPError as error:
        raise SmokeFailure(f"{method} {url}: HTTP {error.code}") from error
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise SmokeFailure(f"{method} {url}: unavailable or invalid response") from error


def wait_for(label, operation, timeout=180):
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            return operation()
        except (SmokeFailure, HTTPError, URLError, TimeoutError, OSError) as error:
            last_error = error
            time.sleep(2)
    raise SmokeFailure(f"{label} did not become ready: {last_error}")


def require(condition, message):
    if not condition:
        raise SmokeFailure(message)


def main():
    parser = argparse.ArgumentParser(description="Football Verse production-shaped smoke")
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--web", default="http://127.0.0.1:3000")
    parser.add_argument("--email", default=os.environ.get("SMOKE_EMAIL"))
    parser.add_argument("--password", default=os.environ.get("SMOKE_PASSWORD"))
    parser.add_argument("--readiness-only", action="store_true")
    args = parser.parse_args()

    suffix = uuid.uuid4().hex[:10]

    wait_for("Gateway", lambda: request("GET", f"{args.base}/health"))
    _, gateway_headers = request("GET", f"{args.base}/health", return_headers=True)
    require(gateway_headers.get("X-Request-Id") is not None, "Gateway request ID is missing")
    wait_for("Web", lambda: urlopen(args.web, timeout=15).read(1))
    with urlopen(f"{args.web.rstrip('/')}/career", timeout=15) as career_response:
        require(career_response.geturl().rstrip("/").endswith("/games"), "Career route does not redirect to Games")
    news = wait_for("Core API", lambda: request("GET", f"{args.base}/api/v1/news?page=0&size=1"))
    provider = wait_for(
        "Prediction service",
        lambda: request("GET", f"{args.base}/matches/premier-league/fixtures"),
    )
    require(isinstance(news, dict) and "content" in news, "News list contract changed")
    require(provider.get("league") == "premier-league", "Prediction league contract changed")
    if args.readiness_only:
        print(json.dumps({"status": "passed", "checks": ["web", "news", "prediction"]}))
        return

    require(args.email and args.password, "Set SMOKE_EMAIL and SMOKE_PASSWORD for a verified non-privileged test account")

    auth, auth_headers = request(
        "POST",
        f"{args.base}/api/v1/auth/login",
        payload={"email": args.email, "password": args.password},
        return_headers=True,
    )
    set_cookie = auth_headers.get("Set-Cookie")
    require(set_cookie and "HttpOnly" in set_cookie, "HttpOnly refresh cookie is missing")
    require("private, no-store" in (auth_headers.get("Cache-Control") or ""), "Auth response is cacheable")
    refresh_cookie = set_cookie.split(";", 1)[0]
    token = auth["accessToken"]
    me = request("GET", f"{args.base}/api/v1/auth/me", token=token)
    require(me["email"] == args.email, "Current-user identity mismatch")

    minigame_headers = {"X-Minigame-Guest": f"smoke-{suffix}"}
    daily_games = request("GET", f"{args.base}/api/v1/minigames/daily", token=token, extra_headers=minigame_headers)
    games_by_type = {game["type"]: game for game in daily_games.get("games", [])}
    require(games_by_type.get("WHO_AM_I", {}).get("available"), "Who Am I fixture is unavailable")
    require(games_by_type.get("GRID", {}).get("available"), "Grid fixture is unavailable")
    who_attempt = request(
        "POST",
        f"{args.base}/api/v1/minigames/daily/who-am-i/attempt?practice=false",
        token=token,
        extra_headers=minigame_headers,
    )
    mystery_players = request(
        "GET",
        f"{args.base}/api/v1/minigames/players?q={quote('Smoke Mystery')}",
        token=token,
        extra_headers=minigame_headers,
    )
    require(mystery_players and mystery_players[0]["name"] == "Smoke Mystery", "Who Am I fixture player is missing")
    who_result = request(
        "POST",
        f"{args.base}/api/v1/minigames/attempts/{who_attempt['id']}/guess",
        token=token,
        payload={"playerId": mystery_players[0]["id"], "version": who_attempt["version"]},
        extra_headers=minigame_headers,
    )
    require(who_result["status"] == "WON", "Who Am I attempt did not complete")
    grid_attempt = request(
        "POST",
        f"{args.base}/api/v1/minigames/daily/grid/attempt?practice=false",
        token=token,
        extra_headers=minigame_headers,
    )
    grid = games_by_type["GRID"]["puzzle"]
    grid_players = request(
        "GET",
        f"{args.base}/api/v1/minigames/players?q={quote('Smoke England')}",
        token=token,
        extra_headers=minigame_headers,
    )
    require(grid_players, "Grid fixture player is missing")
    cell = f"{grid['rows'][0]}|{grid['columns'][0]}"
    grid_result = request(
        "POST",
        f"{args.base}/api/v1/minigames/attempts/{grid_attempt['id']}/guess",
        token=token,
        payload={"playerId": grid_players[0]["id"], "cell": cell, "version": grid_attempt["version"]},
        extra_headers=minigame_headers,
    )
    require(grid_result["score"] >= 5, "Grid versioned action was not scored")
    leaderboard = request("GET", f"{args.base}/api/v1/minigames/leaderboard?scope=combined", token=token)
    require(leaderboard.get("scope") == "combined" and isinstance(leaderboard.get("entries"), list), "Minigame leaderboard contract changed")

    categories = request("GET", f"{args.base}/api/v1/forum/categories")
    require(categories, "Forum seed categories are missing")
    thread = request(
        "POST",
        f"{args.base}/api/v1/forum/categories/{categories[0]['slug']}/threads",
        token=token,
        payload={"title": f"Smoke thread {suffix}", "content": "Generated smoke content", "tags": []},
    )
    reply = request(
        "POST",
        f"{args.base}/api/v1/forum/threads/{thread['id']}/replies",
        token=token,
        payload={"content": "Generated smoke reply"},
    )
    require(reply.get("id") is not None, "Forum reply was not created")

    career, career_headers = request(
        "POST",
        f"{args.base}/game/saves",
        token=token,
        payload={"name": "Smoke Career"},
        return_headers=True,
    )
    require(career_headers.get("X-Auth-Compatibility") is None, "Career used legacy header authentication")
    save_id = career["id"]
    try:
        details = request("GET", f"{args.base}/game/saves/{save_id}", token=token)
        require(details["save"]["id"] == save_id, "Career owner-scoped lookup changed")
        request("GET", f"{args.base}/game/saves/{save_id}/tactics", token=token)
    finally:
        request("DELETE", f"{args.base}/game/saves/{save_id}", token=token)

    refreshed, refresh_headers = request(
        "POST",
        f"{args.base}/api/v1/auth/refresh",
        payload={},
        cookie=refresh_cookie,
        origin=args.web,
        return_headers=True,
    )
    rotated_cookie = refresh_headers.get("Set-Cookie").split(";", 1)[0]
    request(
        "POST",
        f"{args.base}/api/v1/auth/logout",
        payload={},
        cookie=rotated_cookie,
        origin=args.web,
    )

    print(json.dumps({
        "status": "passed",
        "checks": ["web", "career-redirect", "auth", "news", "minigames", "forum", "prediction", "career", "refresh", "logout"],
    }))


if __name__ == "__main__":
    try:
        main()
    except SmokeFailure as error:
        raise SystemExit(f"Smoke failed: {error}") from error
