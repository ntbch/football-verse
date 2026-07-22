from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

from match_engine.domain import EventType, MatchEvent, MatchInput, MatchResult, MatchSimulationState, MatchStats, PlayerStats, Position, TeamSimulationState, TeamSnapshot, TeamStats, Zone

from .actions import MatchRandom, resolve_carry, resolve_pass, resolve_shot, resolve_tackle, select_player


DEFENDERS = (Position.GK, Position.LB, Position.CB, Position.RB, Position.LWB, Position.RWB)
MIDFIELDERS = (Position.DM, Position.CM, Position.AM, Position.LM, Position.RM, Position.LWB, Position.RWB)
ATTACKERS = (Position.AM, Position.LM, Position.RM, Position.LW, Position.RW, Position.ST)


@dataclass
class _TeamState:
    possessions: int = 0
    goals: int = 0
    shots: int = 0
    shots_on_target: int = 0
    xg: float = 0
    passes_attempted: int = 0
    passes_completed: int = 0
    fouls: int = 0
    yellow_cards: int = 0
    red_cards: int = 0


def simulate(match: MatchInput) -> MatchResult:
    return finish(match, advance(match, start(match), 90))


def start(match: MatchInput) -> MatchSimulationState:
    rng = MatchRandom(match.seed)
    minutes = {str(player.id): 0 for team in (match.home, match.away) for player in team.players}
    for team in (match.home, match.away):
        for slot in team.lineup.starters:
            minutes[str(slot.player_id)] = 90
    kickoff = MatchEvent(sequence=1, minute=0, type=EventType.KICKOFF)
    return MatchSimulationState(rng_state=rng.state, current_home=match.home, current_away=match.away,
                                minutes=minutes, events=(kickoff,))


def command(match: MatchInput, snapshot: MatchSimulationState, kind: str, team_id: UUID, *, tactic=None, lineup=None,
            shout: str | None = None, outgoing_id: UUID | None = None,
            incoming_id: UUID | None = None) -> MatchSimulationState:
    if snapshot.completed:
        raise ValueError("Cannot change a completed match")
    side = "current_home" if team_id == match.home.id else "current_away" if team_id == match.away.id else None
    if side is None:
        raise ValueError("Command team is not in this match")
    team = getattr(snapshot, side)
    payload = {}

    if kind == "TACTIC":
        if tactic is None and lineup is None:
            raise ValueError("Tactic or lineup is required")
        if lineup is not None:
            current_starters = {slot.player_id for slot in team.lineup.starters}
            next_starters = {slot.player_id for slot in lineup.starters}
            if current_starters != next_starters or set(team.lineup.bench) != set(lineup.bench):
                raise ValueError("Tactic changes cannot add, remove or substitute players")
        team = team.model_copy(update={"tactic": tactic or team.tactic, "lineup": lineup or team.lineup})
        payload = {"decision": "TACTIC_CHANGE"}
    elif kind == "SHOUT":
        # ponytail: shouts reuse tactic effects; add temporary morale effects when player psychology exists.
        changes = {
            "ENCOURAGE": {"mentality": "POSITIVE"},
            "DEMAND_MORE": {"mentality": "ATTACKING", "tempo": "FAST"},
            "FOCUS": {"passing_style": "SHORT", "tempo": "NORMAL"},
            "CALM_DOWN": {"mentality": "CAUTIOUS", "tempo": "SLOW"},
        }.get(shout)
        if changes is None:
            raise ValueError("Unknown shout")
        updated = team.tactic.__class__.model_validate(team.tactic.model_dump() | changes)
        team = team.model_copy(update={"tactic": updated})
        payload = {"decision": f"SHOUT_{shout}"}
    elif kind == "SUBSTITUTION":
        starters = {slot.player_id for slot in team.lineup.starters}
        if outgoing_id not in starters or outgoing_id in team.inactive_player_ids or incoming_id not in team.lineup.bench:
            raise ValueError("Substitution must replace a starter with a bench player")
        used, windows = _substitution_usage(snapshot.events, team_id)
        halftime = snapshot.half_time_added and snapshot.minute < 55
        current_window = any(event.type == EventType.SUBSTITUTION and event.team_id == team_id
                             and event.minute == snapshot.minute for event in snapshot.events)
        if used >= 5 or (not halftime and not current_window and windows >= 3):
            raise ValueError("No substitutions remaining at this point in the match")
        minutes = dict(snapshot.minutes)
        minutes[str(outgoing_id)] = min(90, snapshot.minute)
        minutes[str(incoming_id)] = max(0, 90 - snapshot.minute)
        team = _replace_player(team, outgoing_id, incoming_id)
        payload = {"outPlayerId": str(outgoing_id), "reason": "MANUAL",
                   "halftime": snapshot.half_time_added and snapshot.minute < 55}
        event = MatchEvent(sequence=len(snapshot.events) + 1, minute=min(90, snapshot.minute),
                           type=EventType.SUBSTITUTION, team_id=team_id, player_id=incoming_id,
                           zone=Zone.MIDDLE, payload=payload)
        return snapshot.model_copy(update={side: team, "minutes": minutes, "events": (*snapshot.events, event)})
    else:
        raise ValueError("Unknown match command")

    event = MatchEvent(sequence=len(snapshot.events) + 1, minute=min(90, snapshot.minute),
                       type=EventType.MANAGER_DECISION, team_id=team_id, zone=Zone.MIDDLE, payload=payload)
    return snapshot.model_copy(update={side: team, "events": (*snapshot.events, event)})


def advance(match: MatchInput, snapshot: MatchSimulationState, target_minute: int) -> MatchSimulationState:
    if snapshot.completed or target_minute < snapshot.minute or target_minute > 90:
        raise ValueError("Target minute must advance an active match and be at most 90")
    rng = MatchRandom(match.seed, snapshot.rng_state)
    events = list(snapshot.events)
    states = {
        match.home.id: _TeamState(**snapshot.home.model_dump()),
        match.away.id: _TeamState(**snapshot.away.model_dump()),
    }
    player_data: dict[UUID, dict[str, int]] = defaultdict(lambda: defaultdict(int), {
        UUID(player_id): defaultdict(int, values) for player_id, values in snapshot.player_data.items()
    })
    minutes = {UUID(player_id): value for player_id, value in snapshot.minutes.items()}

    def event(minute: int, kind: EventType, team=None, player=None, zone=None, **payload):
        events.append(MatchEvent(sequence=len(events) + 1, minute=minute, type=kind, team_id=team, player_id=player, zone=zone, payload=payload))

    half_time_added = snapshot.half_time_added
    substitutions_added = snapshot.substitutions_added
    current = {match.home.id: snapshot.current_home, match.away.id: snapshot.current_away}
    reacted = {(UUID(value.rsplit(":", 1)[0]), int(value.rsplit(":", 1)[1])) for value in snapshot.reacted}
    minute = snapshot.minute
    while minute <= target_minute:
        for original, opponent in ((match.home, match.away), (match.away, match.home)):
            plan = original.manager_plan
            checkpoint = next((value for value in (plan.checkpoints if plan else ())
                               if minute >= value and (original.id, value) not in reacted), None)
            if checkpoint is not None:
                reacted.add((original.id, checkpoint))
                difference = states[original.id].goals - states[opponent.id].goals
                current[original.id], decision = _manager_reaction(current[original.id], difference)
                event(checkpoint, EventType.MANAGER_DECISION, original.id, zone=Zone.MIDDLE,
                      managerId=str(plan.manager_id), managerName=plan.manager_name,
                      decision=decision, scoreDifference=difference)
        if minute >= 45 and not half_time_added:
            event(45, EventType.HALF_TIME)
            half_time_added = True
        if minute >= 60 and not substitutions_added:
            for team_id in (match.home.id, match.away.id):
                used, windows = _substitution_usage(events, team_id)
                count = 0 if windows >= 3 else min(3, 5 - used)
                current[team_id] = _substitutions(60, current[team_id], minutes, event, count)
            substitutions_added = True

        home, away = current[match.home.id], current[match.away.id]
        home_share = min(0.7, max(0.3, 0.52 + (_possession_bias(home) - _possession_bias(away))))
        attacking, defending = (home, away) if rng.random() < home_share else (away, home)
        states[attacking.id].possessions += 1
        _possession(minute, attacking, defending, rng, states, player_data, event)
        for team in (attacking, defending):
            inactive = set(current[team.id].inactive_player_ids)
            inactive.update(value.player_id for value in events
                            if value.type == EventType.RED_CARD and value.team_id == team.id and value.player_id)
            current[team.id] = current[team.id].model_copy(update={"inactive_player_ids": frozenset(inactive)})
        for team in (attacking, defending):
            if states[team.id].red_cards and current[team.id].tactic.mentality not in ("DEFENSIVE", "CAUTIOUS"):
                tactic = current[team.id].tactic.model_copy(update={"mentality": "CAUTIOUS", "width": "NARROW"})
                current[team.id] = current[team.id].model_copy(update={"tactic": tactic})
        injury_risk = 0.0015 + (0.001 if attacking.tactic.pressing == "HIGH" else 0)
        if rng.random() < injury_risk:
            attacking = current[attacking.id]
            player = select_player(attacking, tuple(Position), rng)
            zone, payload = payload_days(rng)
            event(minute, EventType.INJURY, attacking.id, player.id, zone, **payload)
            if attacking.manager_plan:
                event(minute, EventType.MANAGER_DECISION, attacking.id, player.id, Zone.MIDDLE,
                      managerId=str(attacking.manager_plan.manager_id), managerName=attacking.manager_plan.manager_name,
                      decision="INJURY_SUBSTITUTION")
            used, windows = _substitution_usage(events, attacking.id)
            current[attacking.id] = _injury_substitution(minute, attacking, player.id, minutes, event,
                                                         used < 5 and windows < 3)
        minute += _event_minutes(attacking, rng)

    completed = target_minute == 90 and minute > 90
    if completed:
        event(90, EventType.FULL_TIME)
    return MatchSimulationState(
        minute=minute,
        rng_state=rng.state,
        home=TeamSimulationState(**states[match.home.id].__dict__),
        away=TeamSimulationState(**states[match.away.id].__dict__),
        current_home=current[match.home.id],
        current_away=current[match.away.id],
        player_data={str(player_id): dict(values) for player_id, values in player_data.items()},
        minutes={str(player_id): value for player_id, value in minutes.items()},
        events=tuple(events),
        reacted=tuple(sorted(f"{team_id}:{checkpoint}" for team_id, checkpoint in reacted)),
        half_time_added=half_time_added,
        substitutions_added=substitutions_added,
        completed=completed,
    )


def finish(match: MatchInput, snapshot: MatchSimulationState) -> MatchResult:
    if not snapshot.completed:
        raise ValueError("Cannot finish an active match")
    states = {
        match.home.id: _TeamState(**snapshot.home.model_dump()),
        match.away.id: _TeamState(**snapshot.away.model_dump()),
    }
    player_data = defaultdict(lambda: defaultdict(int), {
        UUID(player_id): defaultdict(int, values) for player_id, values in snapshot.player_data.items()
    })
    minutes = {UUID(player_id): value for player_id, value in snapshot.minutes.items()}
    total_possessions = sum(state.possessions for state in states.values()) or 1

    def team_stats(team: TeamSnapshot) -> TeamStats:
        state = states[team.id]
        return TeamStats(
            team_id=team.id,
            goals=state.goals,
            shots=state.shots,
            shots_on_target=state.shots_on_target,
            xg=round(state.xg, 3),
            possession=round(state.possessions * 100 / total_possessions, 1),
            passes_attempted=state.passes_attempted,
            passes_completed=state.passes_completed,
            fouls=state.fouls,
            yellow_cards=state.yellow_cards,
            red_cards=state.red_cards,
        )

    home_stats = team_stats(match.home)
    away_stats = team_stats(match.away)
    # Keep the invariant exact after decimal rounding.
    away_stats = away_stats.model_copy(update={"possession": round(100 - home_stats.possession, 1)})
    players = tuple(player for team in (match.home, match.away) for player in _team_player_stats(team, player_data, minutes))
    stats = MatchStats(home=home_stats, away=away_stats, players=players)
    return MatchResult(
        seed=match.seed,
        engine_version=match.engine_version,
        ruleset_version=match.ruleset_version,
        home_team_id=match.home.id,
        away_team_id=match.away.id,
        home_score=home_stats.goals,
        away_score=away_stats.goals,
        events=snapshot.events,
        stats=stats,
    )


def _position(team: TeamSnapshot, player_id: UUID) -> Position:
    return next(slot.position for slot in team.lineup.starters if slot.player_id == player_id)


def payload_days(rng):
    return Zone.MIDDLE, {"days": 2 + int(rng.uniform(0, 4))}


def _substitution_usage(events, team_id):
    substitutions = [event for event in events if event.type == EventType.SUBSTITUTION and event.team_id == team_id]
    windows = {event.minute for event in substitutions if not event.payload.get("halftime", False)}
    return len(substitutions), len(windows)


def _substitutions(minute: int, team: TeamSnapshot, minutes: dict[UUID, int], event, count=3):
    starters = [slot.player_id for slot in team.lineup.starters if slot.position != Position.GK and minutes[slot.player_id] == 90]
    bench = [player_id for player_id in team.lineup.bench if minutes[player_id] == 0]
    for out_id, in_id in zip(starters[-count:] if count else (), bench[:count], strict=False):
        minutes[out_id] = minute
        minutes[in_id] = 90 - minute
        event(minute, EventType.SUBSTITUTION, team.id, in_id, Zone.MIDDLE, outPlayerId=str(out_id), reason="AUTO")
        team = _replace_player(team, out_id, in_id)
    return team


def _injury_substitution(minute, team, injured_id, minutes, event, allowed=True):
    if not allowed:
        minutes[injured_id] = minute
        return team.model_copy(update={"inactive_player_ids": team.inactive_player_ids | {injured_id}})
    substitute = next((player_id for player_id in team.lineup.bench if minutes[player_id] == 0), None)
    if substitute is None:
        minutes[injured_id] = minute
        return team.model_copy(update={"inactive_player_ids": team.inactive_player_ids | {injured_id}})
    minutes[injured_id] = minute
    minutes[substitute] = 90 - minute
    event(minute, EventType.SUBSTITUTION, team.id, substitute, Zone.MIDDLE, outPlayerId=str(injured_id), reason="INJURY")
    return _replace_player(team, injured_id, substitute)


def _replace_player(team, outgoing_id, incoming_id):
    starters = tuple(slot.model_copy(update={"player_id": incoming_id}) if slot.player_id == outgoing_id else slot
                     for slot in team.lineup.starters)
    lineup = team.lineup.model_copy(update={
        "starters": starters,
        "bench": tuple(player_id for player_id in team.lineup.bench if player_id != incoming_id),
    })
    return team.model_copy(update={"lineup": lineup})


def _possession(minute, attacking, defending, rng, states, player_data, event):
    attack_state, defence_state = states[attacking.id], states[defending.id]
    passer = select_player(attacking, DEFENDERS, rng)
    receiver = select_player(attacking, MIDFIELDERS, rng)
    marker = select_player(defending, ATTACKERS, rng)
    attack_state.passes_attempted += 1
    player_data[passer.id]["passes_attempted"] += 1
    outcome = resolve_pass(passer, receiver, marker, _position(attacking, passer.id), _position(defending, marker.id), attacking.tactic, rng)
    if not _phase_success(outcome.success, _build_up_modifier(attacking, defending), rng):
        event(minute, EventType.TURNOVER, attacking.id, passer.id, Zone.DEFENSIVE)
        return
    attack_state.passes_completed += 1
    player_data[passer.id]["passes_completed"] += 1
    event(minute, EventType.PASS, attacking.id, passer.id, Zone.DEFENSIVE, receiverId=str(receiver.id))

    target = select_player(attacking, ATTACKERS, rng)
    midfielder = select_player(defending, MIDFIELDERS, rng)
    attack_state.passes_attempted += 1
    player_data[receiver.id]["passes_attempted"] += 1
    outcome = resolve_pass(receiver, target, midfielder, _position(attacking, receiver.id), _position(defending, midfielder.id), attacking.tactic, rng)
    if not _phase_success(outcome.success, _progress_modifier(attacking, defending), rng):
        event(minute, EventType.TURNOVER, attacking.id, receiver.id, Zone.MIDDLE)
        return
    attack_state.passes_completed += 1
    player_data[receiver.id]["passes_completed"] += 1
    event(minute, EventType.PASS, attacking.id, receiver.id, Zone.MIDDLE, receiverId=str(target.id))

    defender = select_player(defending, DEFENDERS, rng)
    tackle = resolve_tackle(defender, target, _position(defending, defender.id), _position(attacking, target.id), defending.tactic.pressing, rng)
    if tackle.foul:
        defence_state.fouls += 1
        event(minute, EventType.FOUL, defending.id, defender.id, Zone.ATTACKING)
        card_roll = rng.random()
        if card_roll < 0.03:
            defence_state.red_cards += 1
            event(minute, EventType.RED_CARD, defending.id, defender.id, Zone.ATTACKING)
            if defending.manager_plan:
                event(minute, EventType.MANAGER_DECISION, defending.id, defender.id, Zone.MIDDLE,
                      managerId=str(defending.manager_plan.manager_id), managerName=defending.manager_plan.manager_name,
                      decision="RED_CARD_RESHAPE")
        elif card_roll < 0.28:
            defence_state.yellow_cards += 1
            event(minute, EventType.YELLOW_CARD, defending.id, defender.id, Zone.ATTACKING)
    elif tackle.success:
        player_data[defender.id]["tackles"] += 1
        event(minute, EventType.TACKLE, defending.id, defender.id, Zone.ATTACKING)
        return
    else:
        carry = resolve_carry(target, defender, _position(attacking, target.id), _position(defending, defender.id), rng)
        if not carry.success:
            event(minute, EventType.TURNOVER, attacking.id, target.id, Zone.ATTACKING)
            return
        event(minute, EventType.CARRY, attacking.id, target.id, Zone.ATTACKING)

    goalkeeper = select_player(defending, (Position.GK,), rng)
    shot = resolve_shot(target, goalkeeper, _position(attacking, target.id), Zone.BOX, rng)
    xg = round(shot.xg * _chance_quality(attacking, defending), 3)
    attack_state.shots += 1
    attack_state.xg += xg
    player_data[target.id]["shots"] += 1
    event(minute, EventType.SHOT, attacking.id, target.id, Zone.BOX, xg=xg, onTarget=shot.on_target)
    if shot.on_target:
        attack_state.shots_on_target += 1
        if shot.goal:
            attack_state.goals += 1
            player_data[target.id]["goals"] += 1
            event(minute, EventType.GOAL, attacking.id, target.id, Zone.BOX)
        else:
            event(minute, EventType.SAVE, defending.id, goalkeeper.id, Zone.BOX)


def _manager_reaction(team, score_difference):
    plan = team.manager_plan
    if score_difference < 0:
        tactic = team.tactic.model_copy(update={"mentality": "ATTACKING", "tempo": "FAST", "time_wasting": "OFF"})
        return team.model_copy(update={"tactic": tactic}), "CHASE_GAME"
    if score_difference > 0 and plan.risk < 65:
        tactic = team.tactic.model_copy(update={"mentality": "CAUTIOUS", "tempo": "SLOW", "time_wasting": "MODERATE"})
        return team.model_copy(update={"tactic": tactic}), "PROTECT_LEAD"
    return team, "HOLD_PLAN"


def _possession_bias(team):
    return ({"SHORT": 0.035, "MIXED": 0, "DIRECT": -0.025}[team.tactic.passing_style]
            + {"SLOW": 0.015, "NORMAL": 0, "FAST": -0.01}[team.tactic.tempo])


def _event_minutes(team, rng):
    base = {"FAST": 1, "NORMAL": 2, "SLOW": 2}[team.tactic.tempo]
    delay = {"OFF": 0, "MODERATE": 1, "HIGH": 2}[team.tactic.time_wasting]
    return base + delay + int(rng.uniform(0, 2))


def _phase_success(success, modifier, rng):
    if success and modifier < 0:
        return rng.random() >= -modifier
    if not success and modifier > 0:
        return rng.random() < modifier
    return success


def _build_up_modifier(attacking, defending):
    modifier = {"SHORT": 0.04, "MIXED": 0, "DIRECT": -0.02}[attacking.tactic.passing_style]
    modifier -= {"LOW": 0, "STANDARD": 0.01, "HIGH": 0.05}[defending.tactic.pressing]
    if attacking.tactic.passing_style == "DIRECT" and defending.tactic.pressing == "HIGH":
        modifier += 0.09
    return modifier


def _progress_modifier(attacking, defending):
    modifier = {"NARROW": 0, "NORMAL": 0.01, "WIDE": 0.03}[attacking.tactic.width]
    if defending.tactic.defensive_line == "LOW":
        modifier += 0.04 if attacking.tactic.width == "WIDE" else -0.04
        if attacking.tactic.passing_style == "SHORT":
            technical = sum(player.attributes.passing + player.attributes.first_touch for player in attacking.players) / (2 * len(attacking.players))
            modifier += 0.05 if technical >= 65 else -0.02
    return modifier


def _chance_quality(attacking, defending):
    quality = {"HOLD_SHAPE": 0.9, "BALANCED": 1, "COUNTER": 1.12}[attacking.tactic.transition]
    quality *= {"LOW": 0.88, "STANDARD": 1, "HIGH": 1.08}[defending.tactic.defensive_line]
    return quality


def _team_player_stats(team: TeamSnapshot, data, minutes):
    for player in team.players:
        played = minutes[player.id]
        if played <= 0:
            continue
        values = data[player.id]
        rating = min(10, 6 + values["goals"] * 0.8 + values["tackles"] * 0.05 + values["passes_completed"] * 0.005)
        yield PlayerStats(
            player_id=player.id,
            team_id=team.id,
            minutes=played,
            rating=round(rating, 2),
            goals=values["goals"],
            shots=values["shots"],
            passes_attempted=values["passes_attempted"],
            passes_completed=values["passes_completed"],
            tackles=values["tackles"],
        )
