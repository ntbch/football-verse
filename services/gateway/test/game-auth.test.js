const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

const { authenticateGameRequest } = require("../dist/game-auth");


process.env.JWT_SECRET = "gateway-test-secret-with-at-least-32-characters";
process.env.INTERNAL_TOKEN = "gateway-internal-token-with-24-characters";
process.env.JWT_ISSUER = "football-verse-core";
process.env.JWT_AUDIENCE = "football-verse-api";


function responseStub() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}


test("game auth overwrites untrusted identity headers", () => {
  const token = jwt.sign({ sub: "manager@example.com", uid: 42, roles: ["USER"] }, process.env.JWT_SECRET, {
    expiresIn: "1h",
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
      "x-user-id": "999",
      "x-user-role": "ADMIN",
      "x-authenticated-user": "999",
      "x-internal-token": "forged",
    },
  };
  const res = responseStub();
  let nextCalled = false;

  authenticateGameRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.headers.authorization, `Bearer ${token}`);
  assert.equal(req.headers["x-user-id"], "42");
  assert.equal(req.headers["x-user-role"], undefined);
  assert.equal(req.headers["x-authenticated-user"], undefined);
  assert.equal(req.headers["x-internal-token"], process.env.INTERNAL_TOKEN);
});


test("game auth rejects wrong issuer, audience, and expired tokens", () => {
  const claims = { sub: "manager@example.com", uid: 42, roles: ["USER"] };
  const tokens = [
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: "1h", issuer: "wrong", audience: process.env.JWT_AUDIENCE }),
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: "1h", issuer: process.env.JWT_ISSUER, audience: "wrong" }),
    jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1, issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }),
    jwt.sign(claims, "different-gateway-secret-with-at-least-32-characters", { expiresIn: "1h", issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }),
  ];

  for (const token of tokens) {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = responseStub();
    authenticateGameRequest(req, res, () => assert.fail("next must not run"));
    assert.equal(res.statusCode, 401);
  }
});


test("game auth rejects missing bearer token", () => {
  const req = { headers: {} };
  const res = responseStub();

  authenticateGameRequest(req, res, () => assert.fail("next must not run"));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: "Unauthorized" });
});
