import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node 24's native TypeScript loader requires the file extension.
import { scoreAt } from "./_playback.ts";
import type { MatchEvent } from "../career/_types";

test("scoreAt only counts visible goals for the selected team", () => {
  const events = [
    { sequence: 1, minute: 5, second: 0, type: "SHOT", team_id: "home", player_id: null, zone: "BOX", payload: {} },
    { sequence: 2, minute: 6, second: 0, type: "GOAL", team_id: "home", player_id: null, zone: "BOX", payload: {} },
    { sequence: 3, minute: 7, second: 0, type: "GOAL", team_id: "away", player_id: null, zone: "BOX", payload: {} },
  ] satisfies MatchEvent[];

  assert.equal(scoreAt(events.slice(0, 2), "home"), 1);
  assert.equal(scoreAt(events, "away"), 1);
});
