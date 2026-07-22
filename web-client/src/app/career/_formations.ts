import type { Duty, Formation, PlayerRole, Position } from "./_types";

export const FORMATIONS: Record<Formation, Position[]> = {
  "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "RW", "ST"],
  "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "CM", "RWB", "ST", "ST"],
  "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "LW", "AM", "RW", "ST"],
  "4-1-4-1": ["GK", "LB", "CB", "CB", "RB", "DM", "LM", "CM", "CM", "RM", "ST"],
  "4-3-2-1": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "AM", "AM", "ST"],
  "4-2-2-2": ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "AM", "AM", "ST", "ST"],
  "4-4-1-1": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "AM", "ST"],
  "4-5-1": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "CM", "RM", "ST"],
  "4-2-4": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "LW", "RW", "ST", "ST"],
  "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"],
  "3-4-2-1": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "AM", "AM", "ST"],
  "3-1-4-2": ["GK", "CB", "CB", "CB", "DM", "LM", "CM", "CM", "RM", "ST", "ST"],
  "5-3-2": ["GK", "LWB", "CB", "CB", "CB", "RWB", "CM", "CM", "CM", "ST", "ST"],
  "5-2-3": ["GK", "LWB", "CB", "CB", "CB", "RWB", "CM", "CM", "LW", "ST", "RW"],
};

export const ROLES: Partial<Record<Position, PlayerRole[]>> = {
  GK: ["GOALKEEPER"], LB: ["FULL_BACK", "WING_BACK"], RB: ["FULL_BACK", "WING_BACK"],
  LWB: ["WING_BACK"], RWB: ["WING_BACK"], CB: ["CENTRAL_DEFENDER"],
  DM: ["BALL_WINNER", "CENTRAL_MIDFIELDER"], CM: ["CENTRAL_MIDFIELDER", "BALL_WINNER", "ADVANCED_PLAYMAKER"],
  AM: ["ADVANCED_PLAYMAKER"], LM: ["WINGER"], RM: ["WINGER"], LW: ["WINGER", "INSIDE_FORWARD"],
  RW: ["WINGER", "INSIDE_FORWARD"], ST: ["POACHER", "TARGET_FORWARD", "PRESSING_FORWARD"],
};

export const DUTIES: Partial<Record<PlayerRole, Duty[]>> = {
  GOALKEEPER: ["DEFEND"], POACHER: ["ATTACK"], TARGET_FORWARD: ["SUPPORT", "ATTACK"],
};

export const dutiesFor = (role: PlayerRole): Duty[] => DUTIES[role] ?? ["DEFEND", "SUPPORT", "ATTACK"];

const Y: Record<Position, number> = { GK: 91, LB: 73, CB: 73, RB: 73, LWB: 62, RWB: 62, DM: 57, LM: 43, CM: 43, RM: 43, AM: 27, LW: 20, RW: 20, ST: 9 };
const SIDE: Partial<Record<Position, number>> = { LB: 10, LWB: 9, LM: 10, LW: 10, RB: 90, RWB: 91, RM: 90, RW: 90 };

export function coordinates(positions: Position[]) {
  return positions.map((position, index) => {
    if (SIDE[position] != null) return { x: SIDE[position]!, y: Y[position] };
    const peers = positions.map((value, peer) => ({ value, peer })).filter(({ value }) => value === position);
    const order = peers.findIndex(({ peer }) => peer === index);
    return { x: peers.length === 1 ? 50 : 28 + order * (44 / (peers.length - 1)), y: Y[position] };
  });
}
