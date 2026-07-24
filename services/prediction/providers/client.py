import json
import time
import urllib.request
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request

import config

FOOTBALL_DATA_CACHE = {}
CACHE_TTL_SECONDS = 60


def _get_urlopen():
    import football_api

    return getattr(football_api, "urlopen", None) or urllib.request.urlopen


def api_get(path, params):
    import football_api

    api_key = getattr(football_api, "API_KEY", config.API_KEY)
    if not api_key:
        return None

    url = f"{config.API_BASE_URL}{path}?{urlencode(params)}"
    request = Request(url, headers={"x-apisports-key": api_key})
    try:
        with _get_urlopen()(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return payload if isinstance(payload, dict) else None
    except (HTTPError, URLError, TimeoutError, ValueError, UnicodeError):
        return None


def football_data_get(path, params=None):
    import football_api

    api_key = getattr(football_api, "API_KEY", config.API_KEY)
    if not api_key:
        return None

    key = (path, tuple(sorted((params or {}).items())))
    cached = FOOTBALL_DATA_CACHE.get(key)
    now = time.monotonic()
    if cached and cached["expires_at"] > now:
        return cached["payload"]

    suffix = f"?{urlencode(params)}" if params else ""
    request = Request(f"{config.FOOTBALL_DATA_BASE_URL}{path}{suffix}", headers={"X-Auth-Token": api_key})
    try:
        with _get_urlopen()(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, dict):
                return cached["payload"] if cached else None
            FOOTBALL_DATA_CACHE[key] = {"payload": payload, "expires_at": now + CACHE_TTL_SECONDS}
            return payload
    except (HTTPError, URLError, TimeoutError, ValueError, UnicodeError):
        return cached["payload"] if cached else None
