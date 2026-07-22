import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node 24's native TypeScript loader requires the file extension.
import { draftSubstitutions, scoreAt } from "./_playback.ts";
import type { Lineup, MatchEvent } from "../career/_types";

test("scoreAt only counts visible goals for the selected team", () => {
  const events = [
    { sequence: 1, minute: 5, second: 0, type: "SHOT", team_id: "home", player_id: null, zone: "BOX", payload: {} },
    { sequence: 2, minute: 6, second: 0, type: "GOAL", team_id: "home", player_id: null, zone: "BOX", payload: {} },
    { sequence: 3, minute: 7, second: 0, type: "GOAL", team_id: "away", player_id: null, zone: "BOX", payload: {} },
  ] satisfies MatchEvent[];

  assert.equal(scoreAt(events.slice(0, 2), "home"), 1);
  assert.equal(scoreAt(events, "away"), 1);
});

test("draftSubstitutions batches bench swaps but ignores positional swaps", () => {
  const slot = (player_id: string, position: "GK" | "ST") => ({ player_id, position, role: position === "GK" ? "GOALKEEPER" as const : "POACHER" as const, duty: position === "GK" ? "DEFEND" as const : "ATTACK" as const });
  const applied = { formation: "4-4-2", starters: [slot("keeper", "GK"), slot("forward", "ST")], bench: ["sub"] } satisfies Lineup;
  const positionalSwap = { ...applied, starters: [applied.starters[1], applied.starters[0]] };
  const substitution = { ...applied, starters: [applied.starters[0], slot("sub", "ST")], bench: ["forward"] };

  assert.deepEqual(draftSubstitutions(applied, positionalSwap), []);
  assert.deepEqual(draftSubstitutions(applied, substitution), [
    { outgoingPlayerId: "forward", incomingPlayerId: "sub", position: "ST" },
  ]);
});
