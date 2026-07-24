from collections import defaultdict
from uuid import UUID

from match_engine.domain import EventType, MatchEvent, MatchInput, MatchSimulationState, Position, TeamSimulationState, Zone
from match_engine.engine.actions import MatchRandom, resolve_carry, resolve_pass, resolve_shot, resolve_tackle, select_player
from match_engine.engine.stages.commands import injury_substitution, substitution_usage, substitutions

DEFENDERS = (Position.GK, Position.LB, Position.CB, Position.RB, Position.LWB, Position.RWB)
MIDFIELDERS = (Position.DM, Position.CM, Position.AM, Position.LM, Position.RM, Position.LWB, Position.RWB)
ATTACKERS = (Position.AM, Position.LM, Position.RM, Position.LW, Position.RW, Position.ST)


class _TeamState:
    def __init__(self, possessions=0, goals=0, shots=0, shots_on_target=0, xg=0.0,
                 passes_attempted=0, passes_completed=0, fouls=0, yellow_cards=0, red_cards=0):
        self.possessions = possessions
        self.goals = goals
        self.shots = shots
        self.shots_on_target = shots_on_target
        self.xg = xg
        self.passes_attempted = passes_attempted
        self.passes_completed = passes_completed
        self.fouls = fouls
        self.yellow_cards = yellow_cards
        self.red_cards = red_cards


def advance_match(match: MatchInput, snapshot: MatchSimulationState, target_minute: int) -> MatchSimulationState:
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
                current[original.id], decision = manager_reaction(current[original.id], difference)
                event(checkpoint, EventType.MANAGER_DECISION, original.id, zone=Zone.MIDDLE,
                      managerId=str(plan.manager_id), managerName=plan.manager_name,
                      decision=decision, scoreDifference=difference)
        if minute >= 45 and not half_time_added:
            event(45, EventType.HALF_TIME)
            half_time_added = True
        if minute >= 60 and not substitutions_added:
            for team_id in (match.home.id, match.away.id):
                used, windows = substitution_usage(events, team_id)
                count = 0 if windows >= 3 else min(3, 5 - used)
                current[team_id] = substitutions(60, current[team_id], minutes, event, count)
            substitutions_added = True

        home, away = current[match.home.id], current[match.away.id]
        home_share = min(0.7, max(0.3, 0.52 + (possession_bias(home) - possession_bias(away))))
        attacking, defending = (home, away) if rng.random() < home_share else (away, home)
        states[attacking.id].possessions += 1
        possession(minute, attacking, defending, rng, states, player_data, event)
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
            used, windows = substitution_usage(events, attacking.id)
            current[attacking.id] = injury_substitution(minute, attacking, player.id, minutes, event,
                                                        used < 5 and windows < 3)
        minute += event_minutes(attacking, rng)

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


def possession(minute, attacking, defending, rng, states, player_data, event):
    attack_state, defence_state = states[attacking.id], states[defending.id]
    passer = select_player(attacking, DEFENDERS, rng)
    receiver = select_player(attacking, MIDFIELDERS, rng)
    marker = select_player(defending, ATTACKERS, rng)
    attack_state.passes_attempted += 1
    player_data[passer.id]["passes_attempted"] += 1
    outcome = resolve_pass(passer, receiver, marker, player_position(attacking, passer.id), player_position(defending, marker.id), attacking.tactic, rng)
    if not phase_success(outcome.success, build_up_modifier(attacking, defending), rng):
        event(minute, EventType.TURNOVER, attacking.id, passer.id, Zone.DEFENSIVE)
        return
    attack_state.passes_completed += 1
    player_data[passer.id]["passes_completed"] += 1
    event(minute, EventType.PASS, attacking.id, passer.id, Zone.DEFENSIVE, receiverId=str(receiver.id))

    target = select_player(attacking, ATTACKERS, rng)
    midfielder = select_player(defending, MIDFIELDERS, rng)
    attack_state.passes_attempted += 1
    player_data[receiver.id]["passes_attempted"] += 1
    outcome = resolve_pass(receiver, target, midfielder, player_position(attacking, receiver.id), player_position(defending, midfielder.id), attacking.tactic, rng)
    if not phase_success(outcome.success, progress_modifier(attacking, defending), rng):
        event(minute, EventType.TURNOVER, attacking.id, receiver.id, Zone.MIDDLE)
        return
    attack_state.passes_completed += 1
    player_data[receiver.id]["passes_completed"] += 1
    event(minute, EventType.PASS, attacking.id, receiver.id, Zone.MIDDLE, receiverId=str(target.id))

    defender = select_player(defending, DEFENDERS, rng)
    tackle = resolve_tackle(defender, target, player_position(defending, defender.id), player_position(attacking, target.id), defending.tactic.pressing, rng)
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
        carry = resolve_carry(target, defender, player_position(attacking, target.id), player_position(defending, defender.id), rng)
        if not carry.success:
            event(minute, EventType.TURNOVER, attacking.id, target.id, Zone.ATTACKING)
            return
        event(minute, EventType.CARRY, attacking.id, target.id, Zone.ATTACKING)

    goalkeeper = select_player(defending, (Position.GK,), rng)
    shot = resolve_shot(target, goalkeeper, player_position(attacking, target.id), Zone.BOX, rng)
    xg = round(shot.xg * chance_quality(attacking, defending), 3)
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


def player_position(team, player_id: UUID) -> Position:
    return next(slot.position for slot in team.lineup.starters if slot.player_id == player_id)


def payload_days(rng):
    return Zone.MIDDLE, {"days": 2 + int(rng.uniform(0, 4))}


def manager_reaction(team, score_difference):
    plan = team.manager_plan
    if score_difference < 0:
        tactic = team.tactic.model_copy(update={"mentality": "ATTACKING", "tempo": "FAST", "time_wasting": "OFF"})
        return team.model_copy(update={"tactic": tactic}), "CHASE_GAME"
    if score_difference > 0 and plan.risk < 65:
        tactic = team.tactic.model_copy(update={"mentality": "CAUTIOUS", "tempo": "SLOW", "time_wasting": "MODERATE"})
        return team.model_copy(update={"tactic": tactic}), "PROTECT_LEAD"
    return team, "HOLD_PLAN"


def possession_bias(team):
    return ({"SHORT": 0.035, "MIXED": 0, "DIRECT": -0.025}[team.tactic.passing_style]
            + {"SLOW": 0.015, "NORMAL": 0, "FAST": -0.01}[team.tactic.tempo])


def event_minutes(team, rng):
    base = {"FAST": 1, "NORMAL": 2, "SLOW": 2}[team.tactic.tempo]
    delay = {"OFF": 0, "MODERATE": 1, "HIGH": 2}[team.tactic.time_wasting]
    return base + delay + int(rng.uniform(0, 2))


def phase_success(success, modifier, rng):
    if success and modifier < 0:
        return rng.random() >= -modifier
    if not success and modifier > 0:
        return rng.random() < modifier
    return success


def build_up_modifier(attacking, defending):
    modifier = {"SHORT": 0.04, "MIXED": 0, "DIRECT": -0.02}[attacking.tactic.passing_style]
    modifier -= {"LOW": 0, "STANDARD": 0.01, "HIGH": 0.05}[defending.tactic.pressing]
    if attacking.tactic.passing_style == "DIRECT" and defending.tactic.pressing == "HIGH":
        modifier += 0.09
    return modifier


def progress_modifier(attacking, defending):
    modifier = {"NARROW": 0, "NORMAL": 0.01, "WIDE": 0.03}[attacking.tactic.width]
    if defending.tactic.defensive_line == "LOW":
        modifier += 0.04 if attacking.tactic.width == "WIDE" else -0.04
        if attacking.tactic.passing_style == "SHORT":
            technical = sum(player.attributes.passing + player.attributes.first_touch for player in attacking.players) / (2 * len(attacking.players))
            modifier += 0.05 if technical >= 65 else -0.02
    return modifier


def chance_quality(attacking, defending):
    quality = {"HOLD_SHAPE": 0.9, "BALANCED": 1, "COUNTER": 1.12}[attacking.tactic.transition]
    quality *= {"LOW": 0.88, "STANDARD": 1, "HIGH": 1.08}[defending.tactic.defensive_line]
    return quality
