from enum import StrEnum


class Position(StrEnum):
    GK = "GK"
    LB = "LB"
    CB = "CB"
    RB = "RB"
    LWB = "LWB"
    RWB = "RWB"
    DM = "DM"
    CM = "CM"
    AM = "AM"
    LM = "LM"
    RM = "RM"
    LW = "LW"
    RW = "RW"
    ST = "ST"


class PlayerRole(StrEnum):
    GOALKEEPER = "GOALKEEPER"
    SWEEPER_KEEPER = "SWEEPER_KEEPER"
    FULL_BACK = "FULL_BACK"
    WING_BACK = "WING_BACK"
    CENTRAL_DEFENDER = "CENTRAL_DEFENDER"
    STOPPER = "STOPPER"
    COVER = "COVER"
    BALL_PLAYING_DEFENDER = "BALL_PLAYING_DEFENDER"
    ANCHOR = "ANCHOR"
    BALL_WINNER = "BALL_WINNER"
    DEEP_LYING_PLAYMAKER = "DEEP_LYING_PLAYMAKER"
    CENTRAL_MIDFIELDER = "CENTRAL_MIDFIELDER"
    BOX_TO_BOX = "BOX_TO_BOX"
    ADVANCED_PLAYMAKER = "ADVANCED_PLAYMAKER"
    ATTACKING_MIDFIELDER = "ATTACKING_MIDFIELDER"
    WINGER = "WINGER"
    INSIDE_FORWARD = "INSIDE_FORWARD"
    POACHER = "POACHER"
    TARGET_FORWARD = "TARGET_FORWARD"
    PRESSING_FORWARD = "PRESSING_FORWARD"
    COMPLETE_FORWARD = "COMPLETE_FORWARD"


class Zone(StrEnum):
    DEFENSIVE = "DEFENSIVE"
    MIDDLE = "MIDDLE"
    ATTACKING = "ATTACKING"
    BOX = "BOX"


class Mentality(StrEnum):
    DEFENSIVE = "DEFENSIVE"
    CAUTIOUS = "CAUTIOUS"
    BALANCED = "BALANCED"
    POSITIVE = "POSITIVE"
    ATTACKING = "ATTACKING"


class Tempo(StrEnum):
    SLOW = "SLOW"
    NORMAL = "NORMAL"
    FAST = "FAST"


class Width(StrEnum):
    NARROW = "NARROW"
    NORMAL = "NORMAL"
    WIDE = "WIDE"


class PassingStyle(StrEnum):
    SHORT = "SHORT"
    MIXED = "MIXED"
    DIRECT = "DIRECT"


class Pressing(StrEnum):
    LOW = "LOW"
    STANDARD = "STANDARD"
    HIGH = "HIGH"


class DefensiveLine(StrEnum):
    LOW = "LOW"
    STANDARD = "STANDARD"
    HIGH = "HIGH"


class Transition(StrEnum):
    HOLD_SHAPE = "HOLD_SHAPE"
    BALANCED = "BALANCED"
    COUNTER = "COUNTER"


class TimeWasting(StrEnum):
    OFF = "OFF"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class Formation(StrEnum):
    FOUR_THREE_THREE = "4-3-3"
    FOUR_FOUR_TWO = "4-4-2"
    THREE_FIVE_TWO = "3-5-2"
    FOUR_TWO_THREE_ONE = "4-2-3-1"


class PlayerAvailability(StrEnum):
    AVAILABLE = "AVAILABLE"
    INJURED = "INJURED"
    SUSPENDED = "SUSPENDED"


class EventType(StrEnum):
    KICKOFF = "KICKOFF"
    PASS = "PASS"
    CARRY = "CARRY"
    TACKLE = "TACKLE"
    TURNOVER = "TURNOVER"
    FOUL = "FOUL"
    YELLOW_CARD = "YELLOW_CARD"
    RED_CARD = "RED_CARD"
    SHOT = "SHOT"
    SAVE = "SAVE"
    GOAL = "GOAL"
    INJURY = "INJURY"
    SUBSTITUTION = "SUBSTITUTION"
    HALF_TIME = "HALF_TIME"
    FULL_TIME = "FULL_TIME"
