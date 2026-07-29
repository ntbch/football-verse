import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceTimeline } from "./story-timeline.ts";

test("buildSourceTimeline orders source metadata deterministically and retains evidence relations", () => {
  const timeline = buildSourceTimeline(
    [
      { name: "Later", url: "https://later.test", publishedAt: "2026-07-29T11:00:00Z", primary: false },
      { name: "Unknown", url: "https://unknown.test", primary: false },
      { name: "First", url: "https://first.test", publishedAt: "2026-07-29T10:00:00Z", primary: true },
    ],
    [{ text: "Terms agreed", evidence: [{ sourceName: "First", originalUrl: "https://first.test", relation: "SUPPORT" }] }],
  );

  assert.deepEqual(timeline.map((entry) => entry.name), ["First", "Later", "Unknown"]);
  assert.deepEqual(timeline[0].claims, [{ relation: "SUPPORT", keyPoint: "Terms agreed" }]);
});
