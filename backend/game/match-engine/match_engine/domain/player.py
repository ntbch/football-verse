from uuid import UUID
from .base import Attribute, Percentage, Name, DomainModel
from .enums import Position, PlayerAvailability


class PlayerAttributes(DomainModel):
    passing: Attribute
    first_touch: Attribute
    dribbling: Attribute
    tackling: Attribute
    finishing: Attribute
    pace: Attribute
    strength: Attribute
    stamina: Attribute
    aerial: Attribute
    decisions: Attribute
    positioning: Attribute
    composure: Attribute
    aggression: Attribute
    teamwork: Attribute
    handling: Attribute
    reflexes: Attribute
    one_on_one: Attribute
    distribution: Attribute


class PlayerSnapshot(DomainModel):
    id: UUID
    name: Name
    primary_position: Position
    secondary_positions: frozenset[Position] = frozenset()
    attributes: PlayerAttributes
    availability: PlayerAvailability = PlayerAvailability.AVAILABLE
    fitness: Percentage = 100
    morale: Percentage = 50
    form: Percentage = 50
