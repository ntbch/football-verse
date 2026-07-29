import assert from "node:assert/strict";
import test from "node:test";
import { parseForumDraft } from "./use-forum-draft.ts";

test("parseForumDraft accepts string fields and rejects invalid stored content", () => {
  assert.deepEqual(parseForumDraft('{"title":"Draft","count":1}'), { title: "Draft" });
  assert.equal(parseForumDraft("not-json"), null);
  assert.equal(parseForumDraft("[]"), null);
});
