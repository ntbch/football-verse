import assert from "node:assert/strict";
import test from "node:test";
import { FORMATIONS } from "./_formations";
import { remapFormation } from "./_formation-remap";
import type { Formation, LineupSlot, Player, PlayerRole, Position } from "./_types";

const attributes = Object.fromEntries([
  "passing", "first_touch", "dribbling", "tackling", "finishing", "pace", "strength", "stamina", "aerial",
  "decisions", "positioning", "composure", "aggression", "teamwork", "handling", "reflexes", "one_on_one", "distribution",
].map((name) => [name, 60]));

const player = (id: string, primary_position: Position, availability: Player["availability"] = "AVAILABLE"): Player => ({
  id, name: `Player ${id}`, primary_position, secondary_positions: [], age: 24, attributes,
  availability, fitness: 90, morale: 50, form: 70,
});

const slot = (member: Player, position: Position, role: PlayerRole = position === "GK" ? "GOALKEEPER" : "CENTRAL_MIDFIELDER"): LineupSlot => ({
  player_id: member.id, position, role, duty: role === "GOALKEEPER" ? "DEFEND" : "SUPPORT",
});

test("every formation produces eleven unique available starters", () => {
  for (const [formation, positions] of Object.entries(FORMATIONS) as [Formation, Position[]][]) {
    const squad = positions.map((position, index) => player(`${formation}-${String(index).padStart(2, "0")}`, position));
    const result = remapFormation({ currentFormation: formation, currentSlots: [], currentBench: [], squad, nextFormation: formation });
    assert.equal(result.slots.length, 11);
    assert.equal(new Set(result.slots.map((item) => item.player_id)).size, 11);
    assert.deepEqual(result.slots.map((item) => item.position), positions);
    assert.ok(result.slots.every((item) => squad.find((member) => member.id === item.player_id)?.availability === "AVAILABLE"));
  }
});

test("squad input order cannot change the result", () => {
  const positions = FORMATIONS["4-3-3"];
  const squad = positions.map((position, index) => player(`p-${String(index).padStart(2, "0")}`, position));
  const input = { currentFormation: "4-3-3" as const, currentSlots: [], currentBench: [], nextFormation: "4-3-3" as const };
  assert.deepEqual(remapFormation({ ...input, squad }), remapFormation({ ...input, squad: [...squad].reverse() }));
});

test("unavailable players are replaced and surplus selected players stay on the bench", () => {
  const positions = FORMATIONS["4-3-3"];
  const starters = positions.map((position, index) => player(`s-${String(index).padStart(2, "0")}`, position, index ? "AVAILABLE" : "INJURED"));
  const bench = positions.slice(0, 7).map((position, index) => player(`b-${String(index).padStart(2, "0")}`, position));
  const result = remapFormation({
    currentFormation: "4-3-3", currentSlots: starters.map((member, index) => slot(member, positions[index])),
    currentBench: bench.map((member) => member.id), squad: [...starters, ...bench], nextFormation: "4-3-3",
  });
  assert.ok(result.slots.every((item) => item.player_id !== starters[0].id));
  assert.equal(result.bench.length, 6);
  assert.ok(bench.every((member) => result.slots.some((item) => item.player_id === member.id) || result.bench.includes(member.id)));
});

test("compatible role/duty is preserved and incompatible role is reset with a reason", () => {
  const positions = FORMATIONS["4-3-3"];
  const squad = positions.map((position, index) => player(`r-${String(index).padStart(2, "0")}`, position));
  const currentSlots = squad.map((member, index) => slot(member, positions[index]));
  currentSlots[1] = { ...currentSlots[1], role: "POACHER", duty: "ATTACK" };
  currentSlots[2] = { ...currentSlots[2], role: "CENTRAL_DEFENDER", duty: "SUPPORT" };
  const result = remapFormation({ currentFormation: "4-3-3", currentSlots, currentBench: [], squad, nextFormation: "4-3-3" });
  assert.equal(result.slots[2].role, "CENTRAL_DEFENDER");
  assert.equal(result.slots[2].duty, "SUPPORT");
  assert.match(result.preview.roleResets.find((reason) => reason.includes(squad[1].name)) ?? "", /not compatible/);
});

test("building a preview does not mutate the applied lineup, so cancel is an exact rollback", () => {
  const positions = FORMATIONS["4-3-3"];
  const squad = positions.map((position, index) => player(`c-${String(index).padStart(2, "0")}`, position));
  const currentSlots = squad.map((member, index) => slot(member, positions[index]));
  const before = JSON.stringify({ formation: "4-3-3", slots: currentSlots, bench: [] });

  const pending = remapFormation({
    currentFormation: "4-3-3", currentSlots, currentBench: [], squad, nextFormation: "4-4-2",
  });

  assert.equal(JSON.stringify({ formation: "4-3-3", slots: currentSlots, bench: [] }), before);
  assert.equal(pending.formation, "4-4-2");
});
