import random
from dataclasses import dataclass
from enum import StrEnum
from collections.abc import Iterable, Sequence

from match_engine.domain import PassingStyle, PlayerSnapshot, Position, Pressing, Tactic, TeamSnapshot, Zone

from . import rules


class ActionType(StrEnum):
    PASS = "PASS"
    CARRY = "CARRY"
    TACKLE = "TACKLE"
    SHOT = "SHOT"


@dataclass(frozen=True)
class ActionOutcome:
    action: ActionType
    success: bool
    attacker_score: float
    defender_score: float
    foul: bool = False
    on_target: bool = False
    goal: bool = False
    xg: float = 0.0


class MatchRandom:
    def __init__(self, seed: int):
        self._random = random.Random(seed)

    def uniform(self, low: float, high: float) -> float:
        return self._random.uniform(low, high)

    def random(self) -> float:
        return self._random.random()

    def choice(self, values: Sequence[PlayerSnapshot]) -> PlayerSnapshot:
        return self._random.choice(values)


def select_player(team: TeamSnapshot, positions: Iterable[Position], rng: MatchRandom) -> PlayerSnapshot:
    wanted = set(positions)
    starter_ids = {slot.player_id for slot in team.lineup.starters if slot.position in wanted}
    candidates = sorted((player for player in team.players if player.id in starter_ids), key=lambda player: str(player.id))
    if not candidates:
        raise ValueError("No eligible starter for requested positions")
    return rng.choice(candidates)


def _position_fit(player: PlayerSnapshot, position: Position) -> float:
    if player.primary_position == position:
        return rules.POSITION_FIT
    if position in player.secondary_positions:
        return rules.SECONDARY_POSITION_FIT
    return rules.OUT_OF_POSITION_FIT


def _score(
    player: PlayerSnapshot,
    attributes: tuple[str, ...],
    position: Position,
    rng: MatchRandom,
    tactic_modifier: float = 0,
) -> float:
    base = sum(getattr(player.attributes, attribute) for attribute in attributes) / len(attributes)
    condition = 0.8 + player.fitness / 500
    confidence = 0.9 + (player.morale + player.form) / 1000
    value = base * _position_fit(player, position) * condition * confidence + tactic_modifier
    value += rng.uniform(-rules.ACTION_NOISE, rules.ACTION_NOISE)
    return round(min(rules.MAX_SCORE, max(rules.MIN_SCORE, value)), 3)


def resolve_pass(
    passer: PlayerSnapshot,
    receiver: PlayerSnapshot,
    defender: PlayerSnapshot,
    passer_position: Position,
    defender_position: Position,
    tactic: Tactic,
    rng: MatchRandom,
) -> ActionOutcome:
    style_modifier = {PassingStyle.SHORT: 4, PassingStyle.MIXED: 0, PassingStyle.DIRECT: -4}[tactic.passing_style]
    attack = _score(passer, ("passing", "decisions", "teamwork"), passer_position, rng, style_modifier)
    attack = (attack * 0.75) + (_score(receiver, ("first_touch", "positioning"), receiver.primary_position, rng) * 0.25)
    defence = _score(defender, ("positioning", "decisions", "aggression"), defender_position, rng)
    return ActionOutcome(ActionType.PASS, attack >= defence, round(attack, 3), defence)


def resolve_carry(
    carrier: PlayerSnapshot,
    defender: PlayerSnapshot,
    carrier_position: Position,
    defender_position: Position,
    rng: MatchRandom,
) -> ActionOutcome:
    attack = _score(carrier, ("dribbling", "pace", "decisions"), carrier_position, rng)
    defence = _score(defender, ("tackling", "positioning", "strength"), defender_position, rng)
    return ActionOutcome(ActionType.CARRY, attack >= defence, attack, defence)


def resolve_tackle(
    tackler: PlayerSnapshot,
    carrier: PlayerSnapshot,
    tackler_position: Position,
    carrier_position: Position,
    pressing: Pressing,
    rng: MatchRandom,
) -> ActionOutcome:
    press_modifier = {Pressing.LOW: -3, Pressing.STANDARD: 0, Pressing.HIGH: 4}[pressing]
    defence = _score(tackler, ("tackling", "positioning", "aggression"), tackler_position, rng, press_modifier)
    attack = _score(carrier, ("dribbling", "pace", "composure"), carrier_position, rng)
    foul_risk = min(0.4, 0.05 + max(0, tackler.attributes.aggression - 60) / 200 + max(0, attack - defence) / 200)
    foul = rng.random() < foul_risk
    return ActionOutcome(ActionType.TACKLE, defence >= attack and not foul, attack, defence, foul=foul)


def resolve_shot(
    shooter: PlayerSnapshot,
    goalkeeper: PlayerSnapshot,
    shooter_position: Position,
    zone: Zone,
    rng: MatchRandom,
) -> ActionOutcome:
    shot = _score(shooter, ("finishing", "composure", "decisions"), shooter_position, rng)
    keeper = _score(goalkeeper, ("reflexes", "one_on_one", "positioning"), Position.GK, rng)
    base_xg = {Zone.BOX: 0.28, Zone.ATTACKING: 0.09, Zone.MIDDLE: 0.02, Zone.DEFENSIVE: 0.005}[zone]
    xg = round(min(0.75, max(0.01, base_xg * (0.6 + shot / 125))), 3)
    on_target = rng.random() < min(0.9, max(0.15, 0.2 + shot / 150))
    saved = on_target and keeper + rng.uniform(-5, 5) >= shot + rng.uniform(-5, 5)
    goal = on_target and not saved
    return ActionOutcome(ActionType.SHOT, goal, shot, keeper, on_target=on_target, goal=goal, xg=xg)
