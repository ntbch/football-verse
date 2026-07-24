from uuid import UUID

from match_engine.domain import MatchInput, MatchResult, MatchSimulationState
from match_engine.engine.stages.advancement import advance_match
from match_engine.engine.stages.commands import execute_command, injury_substitution, substitutions
from match_engine.engine.stages.initialization import start_match
from match_engine.engine.stages.projection import finish_match

_injury_substitution = injury_substitution
_substitutions = substitutions


def simulate(match: MatchInput) -> MatchResult:
    return finish(match, advance(match, start(match), 90))


def start(match: MatchInput) -> MatchSimulationState:
    return start_match(match)


def command(match: MatchInput, snapshot: MatchSimulationState, kind: str, team_id: UUID, *, tactic=None, lineup=None,
            shout: str | None = None, outgoing_id: UUID | None = None,
            incoming_id: UUID | None = None) -> MatchSimulationState:
    return execute_command(
        match,
        snapshot,
        kind,
        team_id,
        tactic=tactic,
        lineup=lineup,
        shout=shout,
        outgoing_id=outgoing_id,
        incoming_id=incoming_id,
    )


def advance(match: MatchInput, snapshot: MatchSimulationState, target_minute: int) -> MatchSimulationState:
    return advance_match(match, snapshot, target_minute)


def finish(match: MatchInput, snapshot: MatchSimulationState) -> MatchResult:
    return finish_match(match, snapshot)
