from typing import Annotated, Literal
from uuid import UUID

from fastapi import FastAPI, HTTPException
from pydantic import Field, model_validator

from match_engine.domain import DomainModel, Lineup, MatchInput, MatchResult, MatchSimulationState, Tactic
from match_engine.engine import advance, command, finish, simulate, start


app = FastAPI(title="Football Verse Match Engine")


class StartSessionRequest(DomainModel):
    match: MatchInput


class AdvanceSessionRequest(DomainModel):
    match: MatchInput
    state: MatchSimulationState
    target_minute: Annotated[int, Field(ge=1, le=90)]


class FinishSessionRequest(DomainModel):
    match: MatchInput
    state: MatchSimulationState


class SessionCommand(DomainModel):
    type: Literal["TACTIC", "SHOUT", "SUBSTITUTION"]
    team_id: UUID
    tactic: Tactic | None = None
    lineup: Lineup | None = None
    shout: Literal["ENCOURAGE", "DEMAND_MORE", "FOCUS", "CALM_DOWN"] | None = None
    outgoing_player_id: UUID | None = None
    incoming_player_id: UUID | None = None

    @model_validator(mode="after")
    def complete_command(self):
        valid = ((self.type == "TACTIC" and (self.tactic is not None or self.lineup is not None))
                 or (self.type == "SHOUT" and self.shout is not None)
                 or (self.type == "SUBSTITUTION" and self.outgoing_player_id is not None
                     and self.incoming_player_id is not None))
        if not valid:
            raise ValueError("Command payload does not match its type")
        return self


class CommandSessionRequest(DomainModel):
    match: MatchInput
    state: MatchSimulationState
    command: SessionCommand


@app.get("/health")
def health():
    return {"status": "ok", "service": "match-engine"}


@app.post("/simulate", response_model=MatchResult)
def simulate_match(match: MatchInput):
    return simulate(match)


@app.post("/session/start", response_model=MatchSimulationState)
def start_session(request: StartSessionRequest):
    return start(request.match)


@app.post("/session/advance", response_model=MatchSimulationState)
def advance_session(request: AdvanceSessionRequest):
    return advance(request.match, request.state, request.target_minute)


@app.post("/session/finish", response_model=MatchResult)
def finish_session(request: FinishSessionRequest):
    return finish(request.match, request.state)


@app.post("/session/command", response_model=MatchSimulationState)
def command_session(request: CommandSessionRequest):
    value = request.command
    try:
        return command(request.match, request.state, value.type, value.team_id, tactic=value.tactic, lineup=value.lineup,
                       shout=value.shout, outgoing_id=value.outgoing_player_id,
                       incoming_id=value.incoming_player_id)
    except ValueError as exception:
        raise HTTPException(status_code=422, detail=str(exception)) from exception
