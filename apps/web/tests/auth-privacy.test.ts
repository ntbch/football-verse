import assert from "node:assert/strict";
import test from "node:test";

import { toBrowserAuth } from "../src/shared/lib/auth-session.ts";

test("browser session strips refresh credentials", () => {
  const browserAuth = toBrowserAuth({
    accessToken: "access-only-in-memory",
    refreshToken: "must-not-enter-browser-state",
    userId: 42,
    email: "generated@example.test",
    username: "generated_user",
    roles: ["USER"],
  });

  assert.equal("refreshToken" in browserAuth, false);
  assert.equal(browserAuth.accessToken, "access-only-in-memory");
});
