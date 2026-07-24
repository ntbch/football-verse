import hashlib
import json
from uuid import UUID

from match_engine import ENGINE_VERSION, RULESET_VERSION
from match_engine.domain import (
    FORMATION_POSITIONS,
    Duty,
    Formation,
    Lineup,
    LineupSlot,
    MatchInput,
    PlayerAttributes,
    PlayerRole,
    PlayerSnapshot,
    Position,
    Tactic,
    TeamSnapshot,
)
from match_engine.engine import simulate


def role_for(position: Position) -> PlayerRole:
    return {
        Position.GK: PlayerRole.GOALKEEPER,
        Position.LB: PlayerRole.FULL_BACK,
        Position.CB: PlayerRole.CENTRAL_DEFENDER,
        Position.RB: PlayerRole.FULL_BACK,
        Position.CM: PlayerRole.CENTRAL_MIDFIELDER,
        Position.LW: PlayerRole.WINGER,
        Position.RW: PlayerRole.WINGER,
        Position.ST: PlayerRole.POACHER,
    }[position]


def duty_for(position: Position) -> Duty:
    if position in (Position.GK, Position.CB, Position.LB, Position.RB):
        return Duty.DEFEND
    if position in (Position.LW, Position.RW, Position.ST):
        return Duty.ATTACK
    return Duty.SUPPORT


def make_fixed_player(player_id_str: str, name: str, pos: Position, skill: int = 70) -> PlayerSnapshot:
    attrs = {field: skill for field in PlayerAttributes.model_fields}
    return PlayerSnapshot(
        id=UUID(player_id_str),
        name=name,
        primary_position=pos,
        attributes=PlayerAttributes(**attrs),
    )


def make_fixed_team(team_id_str: str, name: str) -> TeamSnapshot:
    positions = FORMATION_POSITIONS[Formation.FOUR_THREE_THREE]
    players = []
    starters = []
    prefix = team_id_str[:8]
    for idx, pos in enumerate(positions, start=1):
        pid_str = f"{prefix}-0000-0000-0000-{idx:012d}"
        p = make_fixed_player(pid_str, f"{name} Player {idx}", pos)
        players.append(p)
        role = role_for(pos)
        duty = duty_for(pos)
        starters.append(LineupSlot(position=pos, player_id=p.id, role=role, duty=duty))

    return TeamSnapshot(
        id=UUID(team_id_str),
        name=name,
        tactic=Tactic(),
        lineup=Lineup(formation=Formation.FOUR_THREE_THREE, starters=tuple(starters), bench=()),
        players=tuple(players),
    )


def test_golden_simulation_fixture():
    home = make_fixed_team("11111111-1111-1111-1111-111111111111", "Golden Arsenal")
    away = make_fixed_team("22222222-2222-2222-2222-222222222222", "Golden Chelsea")

    match_input = MatchInput(
        seed=123456789,
        engine_version=ENGINE_VERSION,
        ruleset_version=RULESET_VERSION,
        home=home,
        away=away,
    )

    # Assert canonical serialization idempotency
    json_dump = match_input.model_dump_json()
    reloaded = MatchInput.model_validate_json(json_dump)
    assert reloaded == match_input
    canonical_input = json.dumps(match_input.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    assert hashlib.sha256(canonical_input.encode()).hexdigest() == (
        "316a10ff2751484f6e3b3ed2e21f93b458e60f4fb9727ea5c18c3696ee4d7b58"
    )

    # Run simulation
    first = simulate(match_input)
    second = simulate(match_input)

    # Assert strict determinism across multiple runs
    assert first == second

    # Pin the full result, stats and event timeline. Any rules change must bump
    # ENGINE_VERSION/RULESET_VERSION and deliberately replace this golden hash.
    canonical_result = json.dumps(first.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    assert hashlib.sha256(canonical_result.encode()).hexdigest() == (
        "c2e612c35ca56b566cbc778e5ac81335bc3596b117069a23fce23203375f3dcb"
    )
    assert (first.home_score, first.away_score, len(first.events)) == (1, 1, 85)
    assert [(event.minute, event.type, str(event.player_id)[-2:] if event.player_id else None)
            for event in first.events if event.type in {"KICKOFF", "HALF_TIME", "GOAL", "FULL_TIME"}] == [
        (0, "KICKOFF", None),
        (36, "GOAL", "10"),
        (45, "HALF_TIME", None),
        (53, "GOAL", "09"),
        (90, "FULL_TIME", None),
    ]
