import argparse
import base64
import gzip
import hashlib
import hmac
import json
import math
import os
import threading
import time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def call(method, url, token=None, payload=None, timeout=15):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json", "Accept-Encoding": "gzip"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    started = time.perf_counter()
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=timeout) as response:
            encoded = response.read()
            headers = {key.lower(): value for key, value in response.headers.items()}
            raw = gzip.decompress(encoded) if headers.get("content-encoding") == "gzip" else encoded
            return response.status, (time.perf_counter() - started) * 1000, len(encoded), raw, headers
    except HTTPError as error:
        return error.code, (time.perf_counter() - started) * 1000, 0, b"", {key.lower(): value for key, value in (error.headers or {}).items()}
    except (URLError, TimeoutError, OSError):
        return 0, (time.perf_counter() - started) * 1000, 0, b"", {}


def unwrap(raw):
    payload = json.loads(raw.decode("utf-8"))
    return payload["data"] if isinstance(payload, dict) and "success" in payload else payload


def percentile(values, ratio):
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, math.ceil(len(ordered) * ratio) - 1)
    return round(ordered[index], 2)


def access_token(email, secret):
    def encode(value):
        raw = json.dumps(value, separators=(",", ":")).encode("utf-8")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    unsigned = f"{encode({'alg': 'HS256', 'typ': 'JWT'})}.{encode({'sub': email, 'uid': 1, 'roles': [], 'iss': 'football-verse-core', 'aud': 'football-verse-api', 'exp': int(time.time()) + 3600})}"
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()).rstrip(b"=").decode("ascii")
    return f"{unsigned}.{signature}"


def main():
    parser = argparse.ArgumentParser(description="Reproducible HTTP performance baseline")
    parser.add_argument("--base", default="http://127.0.0.1:18100")
    parser.add_argument("--duration", type=int, default=900)
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument("--output")
    parser.add_argument("--jwt-secret", default=os.environ.get("JWT_SECRET", ""))
    args = parser.parse_args()

    if len(args.jwt_secret) < 32:
        raise SystemExit("A JWT secret of at least 32 characters is required for authenticated workload requests")
    token = access_token("perf-1@example.test", args.jwt_secret)

    status, _, _, raw, _ = call("GET", f"{args.base}/api/v1/news?page=0&size=100")
    articles = unwrap(raw)["content"] if status == 200 else []
    if len(articles) < args.workers:
        raise SystemExit("Performance articles are missing")
    article_ids = [article["id"] for article in articles]

    status, _, _, raw, _ = call("GET", f"{args.base}/api/v1/forum/categories")
    categories = unwrap(raw) if status == 200 else []
    if not categories:
        raise SystemExit("Forum categories are missing")
    category_slug = categories[0]["slug"]

    cold_seconds = min(60, max(1, args.duration // 3))
    started = time.monotonic()
    deadline = started + args.duration
    lock = threading.Lock()
    counter_lock = threading.Lock()
    operation_index = 0
    latencies = defaultdict(list)
    response_sizes = defaultdict(list)
    statuses = defaultdict(Counter)
    sizes_over_budget = Counter()
    compressed = Counter()
    cache_headers = Counter()

    def record(phase, group, result):
        response_status, latency, size, _, headers = result
        key = f"{phase}:{group}"
        with lock:
            latencies[key].append(latency)
            response_sizes[key].append(size)
            statuses[key][str(response_status)] += 1
            if size > 1_000_000:
                sizes_over_budget[key] += 1
            if headers.get("content-encoding"):
                compressed[key] += 1
            if headers.get("cache-control"):
                cache_headers[key] += 1

    def worker(worker_id):
        nonlocal operation_index
        article_id = article_ids[worker_id % len(article_ids)]
        while time.monotonic() < deadline:
            with counter_lock:
                index = operation_index
                operation_index += 1
            elapsed = time.monotonic() - started
            phase = "cold" if elapsed < cold_seconds else "warm"
            bucket = index % 10
            if bucket < 7:
                route = index % 4
                if route == 0:
                    page = (index * 37) % 2500
                    result = call("GET", f"{args.base}/api/v1/news?{urlencode({'page': page, 'size': 20})}")
                    group = "public-news"
                elif route == 1:
                    page = (index * 17) % 500
                    result = call("GET", f"{args.base}/api/v1/forum/categories/{category_slug}/threads?{urlencode({'page': page, 'size': 20})}")
                    group = "public-forum"
                elif route == 2:
                    result = call("GET", f"{args.base}/api/v1/predictions/leaderboard?period=weekly")
                    group = "public-leaderboard"
                else:
                    result = call("GET", f"{args.base}/api/v1/news/trending?page=0&size=20")
                    group = "public-trending"
                record(phase, group, result)
            elif bucket < 9:
                route = index % 3
                url = (
                    f"{args.base}/api/v1/auth/me" if route == 0 else
                    f"{args.base}/api/v1/notifications" if route == 1 else
                    f"{args.base}/api/v1/predictions/mine?league=premier-league"
                )
                group = ("auth-me", "auth-notifications", "auth-predictions")[route]
                record(phase, group, call("GET", url, token=token))
            else:
                record(phase, "write", call("POST", f"{args.base}/api/v1/news/{article_id}/like", token=token, payload={}))

    threads = [threading.Thread(target=worker, args=(worker_id,), daemon=True) for worker_id in range(args.workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    result = {
        "durationSeconds": args.duration,
        "workers": args.workers,
        "mix": {"publicRead": 70, "authenticatedRead": 20, "write": 10},
        "dataset": {"users": 10000, "articles": 50000, "forumPosts": 100000, "predictions": 100000},
        "authenticatedIdentity": "performance-seeded-user",
        "phases": {},
    }
    for key, values in sorted(latencies.items()):
        phase, group = key.split(":", 1)
        status_counts = statuses[key]
        total = len(values)
        server_errors = sum(count for status, count in status_counts.items() if status.startswith("5") or status == "0")
        result["phases"].setdefault(phase, {})[group] = {
            "requests": total,
            "requestsPerSecond": round(total / (cold_seconds if phase == "cold" else max(1, args.duration - cold_seconds)), 2),
            "p50Ms": percentile(values, 0.50),
            "p95Ms": percentile(values, 0.95),
            "p99Ms": percentile(values, 0.99),
            "responseBytes": {
                "p50": percentile(response_sizes[key], 0.50),
                "p95": percentile(response_sizes[key], 0.95),
                "p99": percentile(response_sizes[key], 0.99),
            },
            "errorRatePercent": round(server_errors * 100 / max(1, total), 3),
            "statuses": dict(status_counts),
            "compressedResponses": compressed[key],
            "responsesWithCacheHeader": cache_headers[key],
            "responsesOver1Mb": sizes_over_budget[key],
        }
    totals = {"publicRead": 0, "authenticatedRead": 0, "write": 0}
    for phase in result["phases"].values():
        for group, metrics in phase.items():
            bucket = "publicRead" if group.startswith("public-") else "authenticatedRead" if group.startswith("auth-") else "write"
            totals[bucket] += metrics["requests"]
    total_requests = sum(totals.values())
    result["totalRequests"] = total_requests
    result["observedMixPercent"] = {
        key: round(value * 100 / max(1, total_requests), 2) for key, value in totals.items()
    }
    rendered = json.dumps(result, indent=2, sort_keys=True)
    if args.output:
        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
