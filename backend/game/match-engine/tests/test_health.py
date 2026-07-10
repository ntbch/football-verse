from match_engine import main
from match_engine.domain import MatchInput
from tests.test_domain import team


def test_health_reports_ready():
    response = main.health()

    assert response == {"status": "ok", "service": "match-engine"}


def test_simulate_endpoint_uses_engine():
    match = MatchInput(seed=7, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))

    result = main.simulate_match(match)

    assert result.seed == 7
    assert result.home_team_id == match.home.id
