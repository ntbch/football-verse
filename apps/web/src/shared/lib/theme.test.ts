import assert from "node:assert/strict";
import test from "node:test";
import { themeFromValue } from "./theme.ts";

test("themeFromValue keeps dark but safely defaults invalid values to light", () => {
  assert.equal(themeFromValue("dark"), "dark");
  assert.equal(themeFromValue("light"), "light");
  assert.equal(themeFromValue(null), "light");
  assert.equal(themeFromValue("unexpected"), "light");
});
