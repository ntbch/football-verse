import { dutiesFor, ROLES } from "../_formations";
import type { Duty, LineupSlot, Player, PlayerRole, Position } from "../_types";
import { familiarityRank, scorePlayerForPosition } from "./scoring";

export function assignStarters(positions: readonly Position[], players: readonly Player[]): Player[] {
  const rows = positions.length;
  const columns = players.length;
  const u = Array(rows + 1).fill(0);
  const v = Array(columns + 1).fill(0);
  const matchedRow = Array(columns + 1).fill(0);
  const previousColumn = Array(columns + 1).fill(0);
  const cost = (row: number, column: number) => {
    const player = players[column];
    const familiarity = familiarityRank(player, positions[row]);
    const score = (familiarity === 0 ? 1e12 : familiarity === 1 ? 1e9 : 0) + scorePlayerForPosition(player, positions[row]);
    return -score;
  };

  // ponytail: O(n³) Hungarian assignment is exact and tiny for 11 slots; revisit only if formation sizes become unbounded.
  for (let row = 1; row <= rows; row++) {
    matchedRow[0] = row;
    const minimum = Array(columns + 1).fill(Infinity);
    const used = Array(columns + 1).fill(false);
    let column = 0;
    do {
      used[column] = true;
      const activeRow = matchedRow[column];
      let delta = Infinity;
      let nextColumn = 0;
      for (let candidate = 1; candidate <= columns; candidate++) {
        if (used[candidate]) continue;
        const reduced = cost(activeRow - 1, candidate - 1) - u[activeRow] - v[candidate];
        if (reduced < minimum[candidate]) {
          minimum[candidate] = reduced;
          previousColumn[candidate] = column;
        }
        if (minimum[candidate] < delta) {
          delta = minimum[candidate];
          nextColumn = candidate;
        }
      }
      for (let candidate = 0; candidate <= columns; candidate++) {
        if (used[candidate]) {
          u[matchedRow[candidate]] += delta;
          v[candidate] -= delta;
        } else minimum[candidate] -= delta;
      }
      column = nextColumn;
    } while (matchedRow[column]);
    do {
      const nextColumn = previousColumn[column];
      matchedRow[column] = matchedRow[nextColumn];
      column = nextColumn;
    } while (column);
  }

  const assignment = Array<Player>(rows);
  for (let column = 1; column <= columns; column++) {
    if (matchedRow[column]) assignment[matchedRow[column] - 1] = players[column - 1];
  }
  return assignment;
}

const defaultRoleAndDuty = (position: Position): { role: PlayerRole; duty: Duty } => {
  const role = ROLES[position]?.[0] ?? "CENTRAL_MIDFIELDER";
  return { role, duty: dutiesFor(role)[0] };
};
export function roleAndDutyFor(player: Player, position: Position, prior: LineupSlot | undefined) {
  const fallback = defaultRoleAndDuty(position);
  if (!prior) return { ...fallback, reset: undefined };
  if (!ROLES[position]?.includes(prior.role)) return { ...fallback, reset: `${player.name}: ${prior.role}/${prior.duty} reset to ${fallback.role}/${fallback.duty}; ${prior.role} is not compatible with ${position}.` };
  if (!dutiesFor(prior.role).includes(prior.duty)) return { role: prior.role, duty: dutiesFor(prior.role)[0], reset: `${player.name}: ${prior.duty} reset to ${dutiesFor(prior.role)[0]}; ${prior.duty} is not valid for ${prior.role}.` };
  return { role: prior.role, duty: prior.duty, reset: undefined };
}
