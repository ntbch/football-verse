from collections import Counter
from typing import Annotated
from uuid import UUID
from pydantic import Field, model_validator

from .base import DomainModel, Percentage, Name
from .enums import Position, PlayerRole, Formation, PlayerAvailability, Mentality, Tempo, Width, PassingStyle, Pressing, DefensiveLine, Transition, TimeWasting
from .mappings import FORMATION_POSITIONS, ROLE_POSITIONS
from .player import PlayerSnapshot


class LineupSlot(DomainModel):
    player_id: UUID
    position: Position
    role: PlayerRole

    @model_validator(mode="after")
    def role_matches_position(self):
        if self.position not in ROLE_POSITIONS[self.role]:
            raise ValueError(f"Role {self.role} is not valid for position {self.position}")
        return self


class Lineup(DomainModel):
    formation: Formation
    starters: tuple[LineupSlot, ...]
    bench: Annotated[tuple[UUID, ...], Field(max_length=9)] = ()

    @model_validator(mode="after")
    def valid_selection(self):
        if len(self.starters) != 11:
            raise ValueError("Lineup must contain exactly 11 starters")
        starter_ids = [slot.player_id for slot in self.starters]
        if len(set(starter_ids)) != len(starter_ids):
            raise ValueError("Starter player IDs must be unique")
        if len(set(self.bench)) != len(self.bench):
            raise ValueError("Bench player IDs must be unique")
        if set(starter_ids) & set(self.bench):
            raise ValueError("A player cannot be both starter and substitute")
        if Counter(slot.position for slot in self.starters) != Counter(FORMATION_POSITIONS[self.formation]):
            raise ValueError("Starter positions do not match formation")
        return self


class Tactic(DomainModel):
    mentality: Mentality = Mentality.BALANCED
    tempo: Tempo = Tempo.NORMAL
    width: Width = Width.NORMAL
    passing_style: PassingStyle = PassingStyle.MIXED
    pressing: Pressing = Pressing.STANDARD
    defensive_line: DefensiveLine = DefensiveLine.STANDARD
    transition: Transition = Transition.BALANCED
    time_wasting: TimeWasting = TimeWasting.OFF


class TeamSnapshot(DomainModel):
    id: UUID
    name: Name
    players: tuple[PlayerSnapshot, ...]
    lineup: Lineup
    tactic: Tactic = Tactic()

    @model_validator(mode="after")
    def valid_roster(self):
        players_by_id = {player.id: player for player in self.players}
        if len(players_by_id) != len(self.players):
            raise ValueError("Roster player IDs must be unique")
        selected_ids = {slot.player_id for slot in self.lineup.starters} | set(self.lineup.bench)
        if missing := selected_ids - players_by_id.keys():
            raise ValueError(f"Selected players are missing from roster: {sorted(map(str, missing))}")
        unavailable = [
            players_by_id[player_id].name
            for player_id in selected_ids
            if players_by_id[player_id].availability != PlayerAvailability.AVAILABLE
        ]
        if unavailable:
            raise ValueError(f"Selected players are unavailable: {', '.join(sorted(unavailable))}")
        return self
