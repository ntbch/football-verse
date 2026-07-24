from match_engine.domain import EventType, MatchEvent, MatchInput, MatchSimulationState
from match_engine.engine.actions import MatchRandom


def start_match(match: MatchInput) -> MatchSimulationState:
    rng = MatchRandom(match.seed)
    minutes = {str(player.id): 0 for team in (match.home, match.away) for player in team.players}
    for team in (match.home, match.away):
        for slot in team.lineup.starters:
            minutes[str(slot.player_id)] = 90
    kickoff = MatchEvent(sequence=1, minute=0, type=EventType.KICKOFF)
    return MatchSimulationState(
        rng_state=rng.state,
        current_home=match.home,
        current_away=match.away,
        minutes=minutes,
        events=(kickoff,),
    )
