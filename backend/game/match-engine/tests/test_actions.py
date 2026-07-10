from uuid import uuid4

import pytest

from match_engine.domain import PlayerAttributes, PlayerSnapshot, Position, Pressing, Tactic, Zone
from match_engine.engine import MatchRandom, resolve_carry, resolve_shot, resolve_tackle


def player(name: str, position: Position, value: int) -> PlayerSnapshot:
    return PlayerSnapshot(
        id=uuid4(),
        name=name,
        primary_position=position,
        attributes=PlayerAttributes(**{field: value for field in PlayerAttributes.model_fields}),
    )


def test_actions_are_deterministic_for_same_seed():
    attacker = player("Attacker", Position.ST, 75)
    defender = player("Defender", Position.CB, 70)

    first = resolve_carry(attacker, defender, Position.ST, Position.CB, MatchRandom(123))
    second = resolve_carry(attacker, defender, Position.ST, Position.CB, MatchRandom(123))

    assert first == second


def test_strong_shooter_can_beat_weak_goalkeeper():
    result = resolve_shot(player("Striker", Position.ST, 100), player("Keeper", Position.GK, 1), Position.ST, Zone.BOX, MatchRandom(4))

    assert result.on_target
    assert result.goal
    assert result.xg > 0


def test_tackle_reports_foul_deterministically():
    tackler = player("Tackler", Position.CB, 100).model_copy(
        update={"attributes": PlayerAttributes(**{field: (100 if field == "aggression" else 20) for field in PlayerAttributes.model_fields})}
    )
    result = resolve_tackle(tackler, player("Carrier", Position.ST, 90), Position.CB, Position.ST, Pressing.HIGH, MatchRandom(2))

    assert result.foul
    assert not result.success


def test_match_random_does_not_use_global_random(monkeypatch):
    monkeypatch.setattr("random.random", lambda: pytest.fail("global random used"))

    resolve_carry(player("A", Position.ST, 60), player("B", Position.CB, 60), Position.ST, Position.CB, MatchRandom(9))
