import assert from "node:assert/strict";
import test from "node:test";
import { formatDate } from "./format.ts";

test("formatDate uses the public locale and handles missing or invalid values", () => {
  assert.equal(formatDate("2026-07-29T00:00:00Z"), "Jul 29, 2026");
  assert.equal(formatDate("invalid"), "—");
  assert.equal(formatDate(), "—");
});
