import { FORMATIONS } from "./_formations";
import type { Player } from "./_types";
import { assignStarters, roleAndDutyFor } from "./_formation-remap/assignment";
import { positionFamiliarity, scorePlayerForPosition } from "./_formation-remap/scoring";
import type { FormationMove, FormationRemapInput, FormationRemapResult, FormationRoleReset } from "./_formation-remap/types";

export * from "./_formation-remap/scoring";
export type * from "./_formation-remap/types";

export function remapFormation(input: FormationRemapInput): FormationRemapResult {
  const positions = FORMATIONS[input.nextFormation];
  if (!positions) throw new Error(`Unknown formation: ${input.nextFormation}`);

  const byId = new Map<string, Player>();
  for (const player of input.squad) {
    if (byId.has(player.id)) throw new Error(`Squad contains duplicate player id: ${player.id}`);
    byId.set(player.id, player);
  }
  const available = [...byId.values()].filter((player) => player.availability === "AVAILABLE").sort((a, b) => a.id.localeCompare(b.id));
  if (available.length < positions.length) throw new Error(`Formation ${input.nextFormation} needs 11 available players; squad has ${available.length}.`);

  const priorSlots = new Map(input.currentSlots.filter((slot) => slot.player_id).map((slot) => [slot.player_id, slot]));
  const selected = new Set([...input.currentSlots.map((slot) => slot.player_id), ...input.currentBench].filter(Boolean));
  const selectedAvailable = available.filter((player) => selected.has(player.id));
  const candidates = selectedAvailable.length >= 11 ? selectedAvailable : [...selectedAvailable, ...available.filter((player) => !selected.has(player.id)).slice(0, 11 - selectedAvailable.length)];
  const assignments = assignStarters(positions, candidates);
  const unused = new Map(available.map((player) => [player.id, player]));
  assignments.forEach((player) => unused.delete(player.id));

  const roleResetDetails: FormationRoleReset[] = [];
  const slots = positions.map((position, index) => {
    const player = assignments[index];
    const prior = priorSlots.get(player.id);
    const setup = roleAndDutyFor(player, position, prior);
    if (setup.reset && prior) roleResetDetails.push({ playerId: player.id, playerName: player.name, fromRole: prior.role, fromDuty: prior.duty, toRole: setup.role, toDuty: setup.duty, reason: setup.reset });
    return { player_id: player.id, position, role: setup.role, duty: setup.duty };
  });

  const starterIds = new Set(slots.map((slot) => slot.player_id));
  const previousOrder = [...input.currentSlots.map((slot) => slot.player_id), ...input.currentBench];
  const retained = [...new Set(previousOrder)].filter((id) => unused.has(id) && !starterIds.has(id));
  const fillers = [...unused.values()].filter((player) => !retained.includes(player.id)).sort((a, b) => scorePlayerForPosition(b, b.primary_position) - scorePlayerForPosition(a, a.primary_position) || a.id.localeCompare(b.id));
  const bench = [...retained, ...fillers.map((player) => player.id)].slice(0, 7);

  const moveDetails: FormationMove[] = [];
  const nextPosition = new Map(slots.map((slot) => [slot.player_id, slot.position]));
  const oldPosition = new Map(input.currentSlots.filter((slot) => slot.player_id).map((slot) => [slot.player_id, slot.position]));
  for (const slot of slots) {
    const player = byId.get(slot.player_id)!;
    const from = oldPosition.get(player.id) ?? (input.currentBench.includes(player.id) ? "BENCH" : "SQUAD");
    if (from !== slot.position) moveDetails.push({ playerId: player.id, playerName: player.name, from, to: slot.position, reason: `${player.name}: ${from} -> ${slot.position} (${positionFamiliarity(player, slot.position).toLowerCase()} fit).` });
  }
  for (const id of bench) {
    const player = byId.get(id)!;
    const from = oldPosition.get(id) ?? (input.currentBench.includes(id) ? "BENCH" : "SQUAD");
    if (from !== "BENCH") moveDetails.push({ playerId: id, playerName: player.name, from, to: "BENCH", reason: `${player.name}: ${from} -> bench.` });
  }
  const nextSelected = new Set([...nextPosition.keys(), ...bench]);
  for (const id of selected) {
    if (nextSelected.has(id)) continue;
    const player = byId.get(id);
    if (!player) continue;
    const from = oldPosition.get(id) ?? "BENCH";
    const why = player.availability === "AVAILABLE" ? "the seven-player bench is full" : `player is ${player.availability.toLowerCase()}`;
    moveDetails.push({ playerId: id, playerName: player.name, from, to: "SQUAD", reason: `${player.name}: removed from the match selection because ${why}.` });
  }

  return { formation: input.nextFormation, slots, bench, preview: {
    summary: `${input.currentFormation} -> ${input.nextFormation}: ${moveDetails.length} selection move(s), ${roleResetDetails.length} role/duty reset(s).`,
    moves: moveDetails.map((move) => move.reason), roleResets: roleResetDetails.map((reset) => reset.reason), moveDetails, roleResetDetails,
  } };
}
