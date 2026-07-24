from uuid import UUID

from match_engine.domain import EventType, MatchEvent, MatchInput, MatchSimulationState, Position, TeamSnapshot, Zone


def execute_command(
    match: MatchInput,
    snapshot: MatchSimulationState,
    kind: str,
    team_id: UUID,
    *,
    tactic=None,
    lineup=None,
    shout: str | None = None,
    outgoing_id: UUID | None = None,
    incoming_id: UUID | None = None,
) -> MatchSimulationState:
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
        used, windows = substitution_usage(snapshot.events, team_id)
        halftime = snapshot.half_time_added and snapshot.minute < 55
        current_window = any(event.type == EventType.SUBSTITUTION and event.team_id == team_id
                             and event.minute == snapshot.minute for event in snapshot.events)
        if used >= 5 or (not halftime and not current_window and windows >= 3):
            raise ValueError("No substitutions remaining at this point in the match")
        minutes = dict(snapshot.minutes)
        minutes[str(outgoing_id)] = min(90, snapshot.minute)
        minutes[str(incoming_id)] = max(0, 90 - snapshot.minute)
        team = replace_player(team, outgoing_id, incoming_id)
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


def substitution_usage(events, team_id):
    substitutions = [event for event in events if event.type == EventType.SUBSTITUTION and event.team_id == team_id]
    windows = {event.minute for event in substitutions if not event.payload.get("halftime", False)}
    return len(substitutions), len(windows)


def substitutions(minute: int, team: TeamSnapshot, minutes: dict[UUID, int], event, count=3):
    starters = [slot.player_id for slot in team.lineup.starters if slot.position != Position.GK and minutes[slot.player_id] == 90]
    bench = [player_id for player_id in team.lineup.bench if minutes[player_id] == 0]
    for out_id, in_id in zip(starters[-count:] if count else (), bench[:count], strict=False):
        minutes[out_id] = minute
        minutes[in_id] = 90 - minute
        event(minute, EventType.SUBSTITUTION, team.id, in_id, Zone.MIDDLE, outPlayerId=str(out_id), reason="AUTO")
        team = replace_player(team, out_id, in_id)
    return team


def injury_substitution(minute, team, injured_id, minutes, event, allowed=True):
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
    return replace_player(team, injured_id, substitute)


def replace_player(team, outgoing_id, incoming_id):
    starters = tuple(slot.model_copy(update={"player_id": incoming_id}) if slot.player_id == outgoing_id else slot
                     for slot in team.lineup.starters)
    lineup = team.lineup.model_copy(update={
        "starters": starters,
        "bench": tuple(player_id for player_id in team.lineup.bench if player_id != incoming_id),
    })
    return team.model_copy(update={"lineup": lineup})
