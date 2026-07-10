from uuid import uuid4

from match_engine.domain import MatchInput
from match_engine.engine import simulate

from match_engine.domain import Lineup, PlayerSnapshot
from test_domain import attributes, team


def with_bench(seed_team):
    bench = tuple(
        PlayerSnapshot(
            id=uuid4(),
            name=f"Bench {index}",
            primary_position=player.primary_position,
            attributes=attributes(),
        )
        for index, player in enumerate(seed_team.players[:3], start=1)
    )
    bench_ids = tuple(player.id for player in bench)
    return seed_team.model_copy(update={
        "players": seed_team.players + bench,
        "lineup": Lineup(
            formation=seed_team.lineup.formation,
            starters=seed_team.lineup.starters,
            bench=bench_ids,
        ),
    })


def test_simulation_is_deterministic_and_consistent():
    match = MatchInput(seed=99, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))

    first = simulate(match)
    second = simulate(match)

    assert first == second
    assert first.events[0].type == "KICKOFF"
    assert first.events[-1].type == "FULL_TIME"
    assert [event.sequence for event in first.events] == list(range(1, len(first.events) + 1))
    assert first.stats.home.possession + first.stats.away.possession == 100
    assert first.home_score >= 0 and first.away_score >= 0


def test_bench_players_receive_substitution_minutes():
    match = MatchInput(seed=100, engine_version="0.1.0", ruleset_version="1",
                       home=with_bench(team("Home")), away=with_bench(team("Away")))

    result = simulate(match)

    assert any(event.type == "SUBSTITUTION" for event in result.events)
    assert any(player.minutes == 30 for player in result.stats.players)
