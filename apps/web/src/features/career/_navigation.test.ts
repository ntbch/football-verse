import assert from "node:assert/strict";
import test from "node:test";
import { readCareerLocation } from "./_navigation.ts";

test("career location rejects unknown tabs and subtabs", () => {
  assert.deepEqual(readCareerLocation("?tab=nope&sub=jobs&q=%20%20"), {
    tab: "overview", subTab: "", query: "", page: 0, fixtureId: "", marketId: "",
  });
});

test("career location restores a valid workflow and detail", () => {
  assert.deepEqual(readCareerLocation("?tab=transfers&sub=negotiations&q=Town&page=3&detail=market:p1"), {
    tab: "transfers", subTab: "negotiations", query: "Town", page: 3, fixtureId: "", marketId: "p1",
  });
});

test("career location clamps invalid pages", () => {
  assert.equal(readCareerLocation("?page=-4").page, 0);
  assert.equal(readCareerLocation("?page=nope").page, 0);
});
