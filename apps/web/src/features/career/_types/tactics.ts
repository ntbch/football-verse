export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" | "4-1-4-1" | "4-3-2-1" | "4-2-2-2" | "4-4-1-1" | "4-5-1" | "4-2-4" | "3-4-3" | "3-4-2-1" | "3-1-4-2" | "5-3-2" | "5-2-3";
export type Position = "GK" | "LB" | "CB" | "RB" | "LWB" | "RWB" | "DM" | "CM" | "AM" | "LM" | "RM" | "LW" | "RW" | "ST";
export type PlayerRole = "GOALKEEPER" | "FULL_BACK" | "WING_BACK" | "CENTRAL_DEFENDER" | "BALL_WINNER" | "CENTRAL_MIDFIELDER" | "ADVANCED_PLAYMAKER" | "WINGER" | "INSIDE_FORWARD" | "POACHER" | "TARGET_FORWARD" | "PRESSING_FORWARD";
export type Duty = "DEFEND" | "SUPPORT" | "ATTACK";
export type LineupSlot = { player_id: string; position: Position; role: PlayerRole; duty: Duty };
export type Lineup = { formation: Formation; starters: LineupSlot[]; bench: string[] };
export type TacticalSetup = { lineup: Lineup; tactic: Tactic };
export type PlayerAnalysis = { playerId: string; group: string; score: number; reason: string };
export type Tactic = {
  mentality: "DEFENSIVE" | "CAUTIOUS" | "BALANCED" | "POSITIVE" | "ATTACKING";
  tempo: "SLOW" | "NORMAL" | "FAST"; width: "NARROW" | "NORMAL" | "WIDE";
  passing_style: "SHORT" | "MIXED" | "DIRECT"; pressing: "LOW" | "STANDARD" | "HIGH";
  defensive_line: "LOW" | "STANDARD" | "HIGH"; transition: "HOLD_SHAPE" | "BALANCED" | "COUNTER";
  time_wasting: "OFF" | "MODERATE" | "HIGH";
};
