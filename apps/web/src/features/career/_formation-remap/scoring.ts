import type { Player, Position } from "../_types";

const ATTRIBUTES: Record<Position, string[]> = {
  GK: ["handling", "reflexes", "one_on_one", "distribution", "positioning", "composure"],
  LB: ["pace", "stamina", "tackling", "positioning", "passing", "teamwork"], CB: ["tackling", "positioning", "strength", "aerial", "decisions", "pace"],
  RB: ["pace", "stamina", "tackling", "positioning", "passing", "teamwork"], LWB: ["pace", "stamina", "dribbling", "passing", "tackling", "teamwork"],
  RWB: ["pace", "stamina", "dribbling", "passing", "tackling", "teamwork"], DM: ["tackling", "positioning", "decisions", "passing", "teamwork", "strength"],
  CM: ["passing", "first_touch", "decisions", "teamwork", "stamina", "positioning"], AM: ["passing", "first_touch", "dribbling", "decisions", "composure", "finishing"],
  LM: ["pace", "dribbling", "passing", "stamina", "teamwork", "first_touch"], RM: ["pace", "dribbling", "passing", "stamina", "teamwork", "first_touch"],
  LW: ["pace", "dribbling", "finishing", "first_touch", "composure", "passing"], RW: ["pace", "dribbling", "finishing", "first_touch", "composure", "passing"],
  ST: ["finishing", "composure", "pace", "aerial", "strength", "first_touch"],
};
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const finite = (value: number | undefined) => Number.isFinite(value) ? value! : 0;

export function scorePlayerForPosition(player: Player, position: Position): number {
  const relevant = ATTRIBUTES[position].map((attribute) => player.attributes[attribute]).filter(Number.isFinite);
  const attributes = relevant.length ? mean(relevant) : mean(Object.values(player.attributes).filter(Number.isFinite));
  return attributes * 0.8 + finite(player.fitness) * 0.12 + finite(player.form) * 0.08;
}
export function positionFamiliarity(player: Player, position: Position): "PRIMARY" | "SECONDARY" | "HEURISTIC" {
  if (player.primary_position === position) return "PRIMARY";
  if (player.secondary_positions.includes(position)) return "SECONDARY";
  return "HEURISTIC";
}
export const familiarityRank = (player: Player, position: Position) => positionFamiliarity(player, position) === "PRIMARY" ? 0 : positionFamiliarity(player, position) === "SECONDARY" ? 1 : 2;
export const comparePlayersForPosition = (a: Player, b: Player, position: Position) => familiarityRank(a, position) - familiarityRank(b, position) || scorePlayerForPosition(b, position) - scorePlayerForPosition(a, position) || a.id.localeCompare(b.id);
