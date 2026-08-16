import assert from "node:assert/strict";
import test from "node:test";
import { contextualContentState } from "../src/features/context/contextual-content.ts";

test("keeps a match usable when its contextual discussion is unavailable", () => {
  assert.equal(contextualContentState({ status: "error", news: [], threads: [] }), "unavailable");
});

test("renders an honest empty state for an existing context without content", () => {
  assert.equal(contextualContentState({ status: "success", news: [], threads: [] }), "empty");
});

test("renders contextual coverage when an explicitly linked item is present", () => {
  assert.equal(contextualContentState({ status: "success", news: [{ slug: "match-preview" }], threads: [] }), "content");
});
