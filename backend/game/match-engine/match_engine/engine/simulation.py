from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

from match_engine.domain import EventType, MatchEvent, MatchInput, MatchResult, MatchStats, PlayerStats, Position, TeamSnapshot, TeamStats, Zone

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
    rng = MatchRandom(match.seed)
    events: list[MatchEvent] = []
    states = {match.home.id: _TeamState(), match.away.id: _TeamState()}
    player_data: dict[UUID, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    minutes = {player.id: 0 for team in (match.home, match.away) for player in team.players}
    for team in (match.home, match.away):
        for slot in team.lineup.starters:
            minutes[slot.player_id] = 90

    def event(minute: int, kind: EventType, team=None, player=None, zone=None, **payload):
        events.append(MatchEvent(sequence=len(events) + 1, minute=minute, type=kind, team_id=team, player_id=player, zone=zone, payload=payload))

    event(0, EventType.KICKOFF)
    half_time_added = False
    substitutions_added = False
    minute = 1
    while minute <= 90:
        if minute >= 45 and not half_time_added:
            event(45, EventType.HALF_TIME)
            half_time_added = True
        if minute >= 60 and not substitutions_added:
            _substitutions(60, match.home, minutes, event)
            _substitutions(60, match.away, minutes, event)
            substitutions_added = True

        attacking, defending = (match.home, match.away) if rng.random() < 0.52 else (match.away, match.home)
        states[attacking.id].possessions += 1
        _possession(minute, attacking, defending, rng, states, player_data, event)
        if rng.random() < 0.0015:
            player = select_player(attacking, tuple(Position), rng)
            zone, payload = payload_days(rng)
            event(minute, EventType.INJURY, attacking.id, player.id, zone, **payload)
        minute += 1 + int(rng.uniform(0, 2))

    event(90, EventType.FULL_TIME)
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
        events=tuple(events),
        stats=stats,
    )


def _position(team: TeamSnapshot, player_id: UUID) -> Position:
    return next(slot.position for slot in team.lineup.starters if slot.player_id == player_id)


def payload_days(rng):
    return Zone.MIDDLE, {"days": 2 + int(rng.uniform(0, 4))}


def _substitutions(minute: int, team: TeamSnapshot, minutes: dict[UUID, int], event):
    starters = [slot.player_id for slot in team.lineup.starters if slot.position != Position.GK]
    for out_id, in_id in zip(starters[-3:], team.lineup.bench[:3], strict=False):
        minutes[out_id] = minute
        minutes[in_id] = 90 - minute
        event(minute, EventType.SUBSTITUTION, team.id, in_id, Zone.MIDDLE, outPlayerId=str(out_id))


def _possession(minute, attacking, defending, rng, states, player_data, event):
    attack_state, defence_state = states[attacking.id], states[defending.id]
    passer = select_player(attacking, DEFENDERS, rng)
    receiver = select_player(attacking, MIDFIELDERS, rng)
    marker = select_player(defending, ATTACKERS, rng)
    attack_state.passes_attempted += 1
    player_data[passer.id]["passes_attempted"] += 1
    outcome = resolve_pass(passer, receiver, marker, _position(attacking, passer.id), _position(defending, marker.id), attacking.tactic, rng)
    if not outcome.success:
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
    if not outcome.success:
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
        if rng.random() < 0.25:
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
    attack_state.shots += 1
    attack_state.xg += shot.xg
    player_data[target.id]["shots"] += 1
    event(minute, EventType.SHOT, attacking.id, target.id, Zone.BOX, xg=shot.xg, onTarget=shot.on_target)
    if shot.on_target:
        attack_state.shots_on_target += 1
        if shot.goal:
            attack_state.goals += 1
            player_data[target.id]["goals"] += 1
            event(minute, EventType.GOAL, attacking.id, target.id, Zone.BOX)
        else:
            event(minute, EventType.SAVE, defending.id, goalkeeper.id, Zone.BOX)


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
