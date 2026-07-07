from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse

from config import API_KEY, CORS_ORIGIN, FOOTBALL_PROVIDER, PORT, SEASON
from football_api import (
    leagues_payload,
    live_payload,
    provider_debug_payload,
    predictions_payload,
    round_fixtures_payload,
    rounds_payload,
    standings_payload,
)


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    try:
        handler.wfile.write(body)
    except (BrokenPipeError, ConnectionAbortedError):
        return


def league_response(handler, payload):
    if payload is None:
        json_response(handler, 404, {"message": "League not found"})
        return
    json_response(handler, 200, payload)


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        try:
            if path == "/health":
                json_response(self, 200, {"status": "ok"})
                return
            if path == "/leagues":
                json_response(self, 200, leagues_payload())
                return

            parts = path.strip("/").split("/")
            if len(parts) < 2:
                json_response(self, 404, {"message": "Not found"})
                return

            league_slug = parts[1]
            if parts[0] == "matches" and parts[-1] == "rounds":
                league_response(self, rounds_payload(league_slug))
                return
            if parts[0] == "matches" and parts[-1] == "live":
                league_response(self, live_payload(league_slug))
                return
            if parts[0] == "matches" and parts[-1] == "fixtures":
                league_response(self, round_fixtures_payload(league_slug, (query.get("round") or [None])[0]))
                return
            if parts[0] == "predictions":
                league_response(self, predictions_payload(league_slug, (query.get("round") or [None])[0]))
                return
            if parts[0] == "standings":
                league_response(self, standings_payload(league_slug))
                return
            if parts[0] == "debug":
                league_response(self, provider_debug_payload(league_slug))
                return

            json_response(self, 404, {"message": "Not found"})
        except (HTTPError, URLError, TimeoutError) as exc:
            json_response(self, 502, {"message": "Football API unavailable", "detail": str(exc)})

    def log_message(self, format, *args):
        return


def main():
    print(f"match-engine listening on http://localhost:{PORT}", flush=True)
    print(f"football provider: {FOOTBALL_PROVIDER}, api key loaded: {'yes' if API_KEY else 'no'}, season: {SEASON}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
