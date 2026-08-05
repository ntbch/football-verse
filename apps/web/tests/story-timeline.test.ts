import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceTimeline } from "../src/features/news/[slug]/story-timeline.ts";

test("story timeline orders sources and preserves supporting/contradicting evidence", () => {
  const timeline = buildSourceTimeline(
    [
      { name: "Later outlet", url: "https://later.test", publishedAt: "2026-08-05T10:00:00Z", primary: false },
      { name: "Primary outlet", url: "https://primary.test", publishedAt: "2026-08-05T08:00:00Z", primary: true },
    ],
    [{
      text: "The move is being discussed",
      evidence: [
        { sourceName: "Later outlet", originalUrl: "https://later.test", relation: "CONTRADICTION", publishedAt: "2026-08-05T10:00:00Z" },
        { sourceName: "Primary outlet", originalUrl: "https://primary.test", relation: "SUPPORT", publishedAt: "2026-08-05T08:00:00Z" },
      ],
    }],
  );

  assert.deepEqual(timeline.map((entry) => entry.name), ["Primary outlet", "Later outlet"]);
  assert.equal(timeline[0].claims[0].relation, "SUPPORT");
  assert.equal(timeline[1].claims[0].relation, "CONTRADICTION");
});
