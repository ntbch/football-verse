import assert from "node:assert/strict";
import test from "node:test";
import { allowedFields, sanitizeEventFields } from "../src/shared/lib/analytics-contract.ts";

test("daily-loop events retain stable identifiers but reject raw text fields", () => {
  assert.deepEqual(allowedFields("context_opened"), ["contextId", "fixtureId"]);
  assert.deepEqual(
    sanitizeEventFields("context_opened", { contextId: 7, fixtureId: 42, title: "private", team: "Arsenal" }),
    { contextId: 7, fixtureId: 42 },
  );
});

test("event fields are limited to the event contract", () => {
  assert.deepEqual(
    sanitizeEventFields("story_opened", { storyId: 12, sourceCount: 3, contextId: 7, content: "do not emit" }),
    { storyId: 12, sourceCount: 3 },
  );
});
