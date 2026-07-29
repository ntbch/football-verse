import assert from "node:assert/strict";
import test from "node:test";

import { toBrowserAuth } from "../src/shared/lib/auth-session.ts";

test("browser session contains only the cookie-free auth response", () => {
  const browserAuth = toBrowserAuth({
    accessToken: "access-only-in-memory",
    userId: 42,
    email: "generated@example.test",
    username: "generated_user",
    roles: ["USER"],
  });

  assert.equal(browserAuth.accessToken, "access-only-in-memory");
});

test("browser session defaults missing roles to an empty list", () => {
  const browserAuth = toBrowserAuth({
    accessToken: "access-only-in-memory",
    userId: 42,
    email: "generated@example.test",
    username: "generated_user",
    roles: undefined as never,
  });

  assert.deepEqual(browserAuth.roles, []);
});
