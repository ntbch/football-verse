import argparse
import json
from pathlib import Path

from match_engine.domain import MatchInput
from match_engine.engine import simulate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--matches", type=int, default=1000)
    args = parser.parse_args()
    template = MatchInput.model_validate_json(args.input.read_text(encoding="utf-8"))
    results = [simulate(template.model_copy(update={"seed": seed})) for seed in range(args.matches)]
    payload = {
        "matches": len(results),
        "goalsPerMatch": round(sum(result.home_score + result.away_score for result in results) / len(results), 3),
        "homeWinRate": round(sum(result.home_score > result.away_score for result in results) / len(results), 3),
        "drawRate": round(sum(result.home_score == result.away_score for result in results) / len(results), 3),
    }
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
