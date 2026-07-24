import os
from datetime import UTC, datetime
from pathlib import Path


def load_dotenv(path):
    if not path.exists():
        return

    with path.open(encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv(Path.cwd() / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


LEAGUES = {
    "premier-league": {"id": "39", "code": "PL", "name": "Premier League"},
}
FOOTBALL_PROVIDER = os.getenv("FOOTBALL_PROVIDER", "football-data")


def current_football_season():
    now = datetime.now(UTC)
    return str(now.year if now.month >= 7 else now.year - 1)


SEASON = os.getenv("FOOTBALL_SEASON", current_football_season())
API_BASE_URL = os.getenv("FOOTBALL_API_BASE_URL", "https://v3.football.api-sports.io")
FOOTBALL_DATA_BASE_URL = os.getenv("FOOTBALL_DATA_BASE_URL", "https://api.football-data.org/v4")
API_KEY = os.getenv("FOOTBALL_API_KEY", "")
PORT = int(os.getenv("PORT", "8090"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
MOCK_FIXTURES = []
MOCK_STANDINGS = []
