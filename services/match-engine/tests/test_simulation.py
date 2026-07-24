from time import perf_counter
from uuid import uuid4

import pytest

from match_engine.domain import MatchInput, MatchSimulationState
from match_engine.engine import advance, command, finish, simulate, start

from match_engine.domain import Lineup, ManagerPlan, PlayerSnapshot, Tactic
from match_engine.engine.actions import MatchRandom, select_player
from match_engine.engine.simulation import _injury_substitution, _substitutions
from test_domain import attributes, team


def with_bench(seed_team, count=3):
    bench = tuple(
        PlayerSnapshot(
            id=uuid4(),
            name=f"Bench {index}",
            primary_position=player.primary_position,
            attributes=attributes(),
        )
        for index, player in enumerate((seed_team.players * count)[:count], start=1)
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


def test_segmented_simulation_resumes_to_identical_result():
    match = MatchInput(seed=199, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))
    state = start(match)

    for boundary in (15, 30, 45, 60, 75, 90):
        state = MatchSimulationState.model_validate_json(state.model_dump_json())
        if state.minute <= boundary:
            state = advance(match, state, boundary)

    assert finish(match, state) == simulate(match)


def test_segment_replay_is_byte_equivalent():
    match = MatchInput(seed=200, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))
    state = advance(match, start(match), 15)
    persisted = MatchSimulationState.model_validate_json(state.model_dump_json())

    first = advance(match, persisted, 30).model_dump_json()
    second = advance(match, persisted, 30).model_dump_json()

    assert first == second


def test_segment_p95_is_under_one_second():
    match = MatchInput(seed=201, engine_version="0.1.0", ruleset_version="1", home=team("Home"), away=team("Away"))
    durations = []
    for _ in range(20):
        state = start(match)
        started = perf_counter()
        advance(match, state, 15)
        durations.append(perf_counter() - started)

    assert sorted(durations)[18] < 1


def test_bench_players_receive_substitution_minutes():
    match = MatchInput(seed=100, engine_version="0.1.0", ruleset_version="1",
                       home=with_bench(team("Home")), away=with_bench(team("Away")))

    result = simulate(match)

    assert any(event.type == "SUBSTITUTION" for event in result.events)
    assert any(player.minutes == 30 for player in result.stats.players)


def test_normal_substitutions_replace_active_starters():
    original = with_bench(team("Home"))
    minutes = {player.id: 0 for player in original.players}
    minutes.update({slot.player_id: 90 for slot in original.lineup.starters})
    outgoing = [slot.player_id for slot in original.lineup.starters if slot.position != "GK"]
    expected_outgoing = set(outgoing[-3:])
    updated = _substitutions(60, original, minutes, lambda *args, **kwargs: None)
    active = {slot.player_id for slot in updated.lineup.starters}

    assert expected_outgoing.isdisjoint(active)
    assert set(original.lineup.bench).issubset(active)
    for outgoing_id, incoming_id in zip(outgoing[-3:], original.lineup.bench, strict=True):
        position = next(slot.position for slot in original.lineup.starters if slot.player_id == outgoing_id)
        assert select_player(updated, (position,), MatchRandom(1)).id == incoming_id
    assert type(updated).model_validate_json(updated.model_dump_json()) == updated


def test_tactic_command_cannot_hide_a_substitution():
    home = with_bench(team("Home"))
    match = MatchInput(seed=102, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))
    changed = home.lineup.model_copy(update={
        "starters": (*home.lineup.starters[:-1], home.lineup.starters[-1].model_copy(update={"player_id": home.lineup.bench[0]})),
        "bench": (*home.lineup.bench[1:], home.lineup.starters[-1].player_id),
    })

    with pytest.raises(ValueError, match="cannot add, remove or substitute"):
        command(match, start(match), "TACTIC", home.id, lineup=changed)


def test_manual_substitutions_stop_at_five_players():
    home = with_bench(team("Home"), 7)
    match = MatchInput(seed=103, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))
    state = start(match)
    outgoing = [slot.player_id for slot in home.lineup.starters if slot.position != "GK"]

    for out_id, in_id in zip(outgoing[:5], home.lineup.bench[:5], strict=True):
        state = command(match, state, "SUBSTITUTION", home.id, outgoing_id=out_id, incoming_id=in_id)

    with pytest.raises(ValueError, match="No substitutions remaining"):
        command(match, state, "SUBSTITUTION", home.id,
                outgoing_id=outgoing[5], incoming_id=home.lineup.bench[5])


def test_manual_substitutions_stop_after_three_windows():
    home = with_bench(team("Home"), 7)
    match = MatchInput(seed=104, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))
    state = start(match)

    for _ in range(3):
        out_id = next(slot.player_id for slot in state.current_home.lineup.starters if slot.position != "GK")
        in_id = state.current_home.lineup.bench[0]
        state = command(match, state, "SUBSTITUTION", home.id, outgoing_id=out_id, incoming_id=in_id)
        state = advance(match, state, min(44, state.minute + 5))

    out_id = next(slot.player_id for slot in state.current_home.lineup.starters if slot.position != "GK")
    with pytest.raises(ValueError, match="No substitutions remaining"):
        command(match, state, "SUBSTITUTION", home.id,
                outgoing_id=out_id, incoming_id=state.current_home.lineup.bench[0])


def test_injury_substitution_replaces_player_for_future_selection():
    original = with_bench(team("Home"))
    injured = original.lineup.starters[-1]
    substitute = original.lineup.bench[0]
    minutes = {player.id: 0 for player in original.players}
    minutes.update({slot.player_id: 90 for slot in original.lineup.starters})

    updated = _injury_substitution(25, original, injured.player_id, minutes, lambda *args, **kwargs: None)
    active = {slot.player_id for slot in updated.lineup.starters}

    assert injured.player_id not in active
    assert substitute in active
    assert select_player(updated, (injured.position,), MatchRandom(1)).id == substitute
    assert substitute not in updated.lineup.bench


def test_unresolved_injury_deactivates_player_and_blocks_a_late_substitution():
    home = with_bench(team("Home"))
    injured = home.lineup.starters[-1]
    minutes = {player.id: 0 for player in home.players}
    minutes.update({slot.player_id: 90 for slot in home.lineup.starters})
    inactive = _injury_substitution(80, home, injured.player_id, minutes, lambda *args, **kwargs: None, allowed=False)
    match = MatchInput(seed=105, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))
    state = start(match).model_copy(update={"current_home": inactive})

    assert injured.player_id in inactive.inactive_player_ids
    assert minutes[injured.player_id] == 80
    with pytest.raises(ValueError, match="must replace a starter"):
        command(match, state, "SUBSTITUTION", home.id,
                outgoing_id=injured.player_id, incoming_id=home.lineup.bench[0])


def test_tactics_change_timeline_but_remain_deterministic():
    home = team("Home").model_copy(update={"tactic": Tactic(tempo="FAST", pressing="HIGH", transition="COUNTER")})
    away = team("Away").model_copy(update={"tactic": Tactic(tempo="SLOW", defensive_line="LOW", time_wasting="HIGH")})
    match = MatchInput(seed=101, engine_version="0.1.0", ruleset_version="1", home=home, away=away)

    first = simulate(match)
    second = simulate(match)
    baseline = simulate(MatchInput(seed=101, engine_version="0.1.0", ruleset_version="1", home=team("Base Home"), away=team("Base Away")))

    assert first == second
    assert first.stats.home.possession != 50
    assert len(first.events) != len(baseline.events)


def test_manager_plan_reacts_at_bounded_checkpoints():
    plan = ManagerPlan(manager_id=uuid4(), manager_name="Coach", adaptability=70, risk=40)
    home = team("Home").model_copy(update={"manager_plan": plan})
    match = MatchInput(seed=102, engine_version="0.1.0", ruleset_version="1", home=home, away=team("Away"))

    result = simulate(match)
    decisions = [event for event in result.events if event.type == "MANAGER_DECISION"]

    assert [event.minute for event in decisions] == [30, 45, 60, 75]
    assert all(event.payload["managerName"] == "Coach" for event in decisions)
