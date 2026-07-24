from uuid import uuid4

import pytest
from pydantic import ValidationError

from match_engine.domain import (
    FORMATION_POSITIONS,
    Duty,
    Formation,
    Lineup,
    LineupSlot,
    MatchInput,
    PlayerAttributes,
    PlayerAvailability,
    PlayerRole,
    PlayerSnapshot,
    Position,
    TeamSnapshot,
)


def attributes(value=60):
    return PlayerAttributes(**{field: value for field in PlayerAttributes.model_fields})


def role_for(position):
    return {
        Position.GK: PlayerRole.GOALKEEPER,
        Position.LB: PlayerRole.FULL_BACK,
        Position.CB: PlayerRole.CENTRAL_DEFENDER,
        Position.RB: PlayerRole.FULL_BACK,
        Position.CM: PlayerRole.CENTRAL_MIDFIELDER,
        Position.LW: PlayerRole.WINGER,
        Position.RW: PlayerRole.WINGER,
        Position.ST: PlayerRole.POACHER,
    }[position]


def team(name, unavailable=False):
    players = [
        PlayerSnapshot(
            id=uuid4(),
            name=f"{name} Player {index}",
            primary_position=position,
            attributes=attributes(),
            availability=PlayerAvailability.INJURED if unavailable and index == 0 else PlayerAvailability.AVAILABLE,
        )
        for index, position in enumerate(FORMATION_POSITIONS[Formation.FOUR_THREE_THREE])
    ]
    lineup = Lineup(
        formation=Formation.FOUR_THREE_THREE,
        starters=tuple(
            LineupSlot(player_id=player.id, position=position, role=role_for(position))
            for player, position in zip(players, FORMATION_POSITIONS[Formation.FOUR_THREE_THREE], strict=True)
        ),
    )
    return TeamSnapshot(id=uuid4(), name=name, players=tuple(players), lineup=lineup)


def test_valid_match_input_round_trips_json():
    match = MatchInput(seed=7, engine_version="1", ruleset_version="1", home=team("Home"), away=team("Away"))

    restored = MatchInput.model_validate_json(match.model_dump_json())

    assert restored == match


def test_attributes_must_stay_between_one_and_one_hundred():
    with pytest.raises(ValidationError):
        attributes(101)


def test_lineup_requires_exact_formation_positions():
    valid_team = team("Home")
    slots = list(valid_team.lineup.starters)
    slots[-1] = LineupSlot(player_id=slots[-1].player_id, position=Position.CM, role=PlayerRole.CENTRAL_MIDFIELDER)

    with pytest.raises(ValidationError, match="positions do not match formation"):
        Lineup(formation=Formation.FOUR_THREE_THREE, starters=tuple(slots))


def test_role_must_match_position():
    with pytest.raises(ValidationError, match="not valid for position"):
        LineupSlot(player_id=uuid4(), position=Position.GK, role=PlayerRole.POACHER)


def test_all_formations_have_eleven_slots_and_duties_are_validated():
    assert len(FORMATION_POSITIONS) == 15
    assert all(len(positions) == 11 for positions in FORMATION_POSITIONS.values())
    assert LineupSlot(player_id=uuid4(), position=Position.GK, role=PlayerRole.GOALKEEPER).duty == Duty.DEFEND
    with pytest.raises(ValidationError, match="not valid for role"):
        LineupSlot(player_id=uuid4(), position=Position.ST, role=PlayerRole.POACHER, duty=Duty.SUPPORT)


def test_selected_player_must_be_available():
    with pytest.raises(ValidationError, match="unavailable"):
        team("Home", unavailable=True)


def test_home_and_away_cannot_be_same_team():
    home = team("Home")

    with pytest.raises(ValidationError, match="must be different"):
        MatchInput(seed=7, engine_version="1", ruleset_version="1", home=home, away=home)
