from typing import Annotated
from uuid import UUID
from pydantic import Field, JsonValue, model_validator

from .base import DomainModel, Percentage, Version
from .enums import EventType, Zone
from .team import TeamSnapshot


class MatchInput(DomainModel):
    seed: Annotated[int, Field(ge=0, le=2**63 - 1)]
    engine_version: Version
    ruleset_version: Version
    home: TeamSnapshot
    away: TeamSnapshot

    @model_validator(mode="after")
    def different_teams(self):
        if self.home.id == self.away.id:
            raise ValueError("Home and away teams must be different")
        home_players = {player.id for player in self.home.players}
        away_players = {player.id for player in self.away.players}
        if home_players & away_players:
            raise ValueError("Home and away rosters cannot share players")
        return self


class MatchEvent(DomainModel):
    sequence: Annotated[int, Field(ge=1)]
    minute: Annotated[int, Field(ge=0, le=130)]
    second: Annotated[int, Field(ge=0, le=59)] = 0
    type: EventType
    team_id: UUID | None = None
    player_id: UUID | None = None
    zone: Zone | None = None
    payload: dict[str, JsonValue] = Field(default_factory=dict)


class TeamStats(DomainModel):
    team_id: UUID
    goals: Annotated[int, Field(ge=0)] = 0
    shots: Annotated[int, Field(ge=0)] = 0
    shots_on_target: Annotated[int, Field(ge=0)] = 0
    xg: Annotated[float, Field(ge=0)] = 0
    possession: Percentage = 50
    passes_attempted: Annotated[int, Field(ge=0)] = 0
    passes_completed: Annotated[int, Field(ge=0)] = 0
    fouls: Annotated[int, Field(ge=0)] = 0
    yellow_cards: Annotated[int, Field(ge=0)] = 0
    red_cards: Annotated[int, Field(ge=0)] = 0

    @model_validator(mode="after")
    def valid_totals(self):
        if self.shots_on_target > self.shots:
            raise ValueError("Shots on target cannot exceed shots")
        if self.passes_completed > self.passes_attempted:
            raise ValueError("Completed passes cannot exceed attempted passes")
        return self


class PlayerStats(DomainModel):
    player_id: UUID
    team_id: UUID
    minutes: Annotated[int, Field(ge=0, le=130)] = 0
    rating: Annotated[float, Field(ge=1, le=10)] = 6
    goals: Annotated[int, Field(ge=0)] = 0
    assists: Annotated[int, Field(ge=0)] = 0
    shots: Annotated[int, Field(ge=0)] = 0
    passes_attempted: Annotated[int, Field(ge=0)] = 0
    passes_completed: Annotated[int, Field(ge=0)] = 0
    tackles: Annotated[int, Field(ge=0)] = 0


class MatchStats(DomainModel):
    home: TeamStats
    away: TeamStats
    players: tuple[PlayerStats, ...] = ()

    @model_validator(mode="after")
    def valid_stats(self):
        if self.home.team_id == self.away.team_id:
            raise ValueError("Stats must belong to two different teams")
        if abs(self.home.possession + self.away.possession - 100) > 0.1:
            raise ValueError("Team possession must total 100")
        player_ids = [player.player_id for player in self.players]
        if len(set(player_ids)) != len(player_ids):
            raise ValueError("Player stats must be unique")
        return self


class MatchResult(DomainModel):
    seed: Annotated[int, Field(ge=0, le=2**63 - 1)]
    engine_version: Version
    ruleset_version: Version
    home_team_id: UUID
    away_team_id: UUID
    home_score: Annotated[int, Field(ge=0)]
    away_score: Annotated[int, Field(ge=0)]
    events: tuple[MatchEvent, ...]
    stats: MatchStats

    @model_validator(mode="after")
    def internally_consistent(self):
        if self.home_team_id == self.away_team_id:
            raise ValueError("Home and away teams must be different")
        if self.stats.home.team_id != self.home_team_id or self.stats.away.team_id != self.away_team_id:
            raise ValueError("Stats team IDs do not match result team IDs")
        if self.stats.home.goals != self.home_score or self.stats.away.goals != self.away_score:
            raise ValueError("Stats goals do not match result score")
        if [event.sequence for event in self.events] != list(range(1, len(self.events) + 1)):
            raise ValueError("Event sequence must be contiguous and start at 1")
        return self


class TeamSimulationState(DomainModel):
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


class MatchSimulationState(DomainModel):
    minute: Annotated[int, Field(ge=1, le=131)] = 1
    rng_state: str
    home: TeamSimulationState = Field(default_factory=TeamSimulationState)
    away: TeamSimulationState = Field(default_factory=TeamSimulationState)
    current_home: TeamSnapshot
    current_away: TeamSnapshot
    player_data: dict[str, dict[str, int]] = Field(default_factory=dict)
    minutes: dict[str, int] = Field(default_factory=dict)
    events: tuple[MatchEvent, ...] = ()
    reacted: tuple[str, ...] = ()
    half_time_added: bool = False
    substitutions_added: bool = False
    completed: bool = False
