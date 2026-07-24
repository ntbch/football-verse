import argparse
import json
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class SmokeFailure(RuntimeError):
    pass


def request(method, url, token=None, payload=None, timeout=15, return_headers=False, cookie=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if cookie:
        headers["Cookie"] = cookie

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
    args = parser.parse_args()

    suffix = uuid.uuid4().hex[:10]
    email = f"smoke-{suffix}@example.test"
    username = f"smoke_{suffix}"
    password = "SmokeOnlyPassword123!"

    wait_for("Gateway", lambda: request("GET", f"{args.base}/health"))
    _, gateway_headers = request("GET", f"{args.base}/health", return_headers=True)
    require(gateway_headers.get("X-Request-Id") is not None, "Gateway request ID is missing")
    wait_for("Web", lambda: urlopen(args.web, timeout=15).read(1))
    news = wait_for("Core API", lambda: request("GET", f"{args.base}/api/v1/news?page=0&size=1"))
    provider = wait_for(
        "Prediction service",
        lambda: request("GET", f"{args.base}/matches/premier-league/fixtures"),
    )
    require(isinstance(news, dict) and "content" in news, "News list contract changed")
    require(provider.get("league") == "premier-league", "Prediction league contract changed")

    auth, auth_headers = request(
        "POST",
        f"{args.base}/api/v1/auth/register",
        payload={"email": email, "username": username, "password": password},
        return_headers=True,
    )
    set_cookie = auth_headers.get("Set-Cookie")
    require(set_cookie and "HttpOnly" in set_cookie, "HttpOnly refresh cookie is missing")
    require("private, no-store" in (auth_headers.get("Cache-Control") or ""), "Auth response is cacheable")
    refresh_cookie = set_cookie.split(";", 1)[0]
    token = auth["accessToken"]
    me = request("GET", f"{args.base}/api/v1/auth/me", token=token)
    require(me["email"] == email and me["username"] == username, "Current-user identity mismatch")

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
        return_headers=True,
    )
    rotated_cookie = refresh_headers.get("Set-Cookie").split(";", 1)[0]
    request(
        "POST",
        f"{args.base}/api/v1/auth/logout",
        payload={},
        cookie=rotated_cookie,
    )

    print(json.dumps({
        "status": "passed",
        "checks": ["web", "auth", "news", "forum", "prediction", "career", "refresh", "logout"],
    }))


if __name__ == "__main__":
    try:
        main()
    except SmokeFailure as error:
        raise SystemExit(f"Smoke failed: {error}") from error
