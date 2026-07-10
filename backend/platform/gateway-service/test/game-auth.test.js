const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

const { authenticateGameRequest } = require("../dist/game-auth");


process.env.JWT_SECRET = "gateway-test-secret";
process.env.INTERNAL_TOKEN = "gateway-internal-token";


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
  });
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
      "x-user-id": "999",
      "x-internal-token": "forged",
    },
  };
  const res = responseStub();
  let nextCalled = false;

  authenticateGameRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.headers.authorization, undefined);
  assert.equal(req.headers["x-user-id"], "42");
  assert.equal(req.headers["x-internal-token"], process.env.INTERNAL_TOKEN);
});


test("game auth rejects missing bearer token", () => {
  const req = { headers: {} };
  const res = responseStub();

  authenticateGameRequest(req, res, () => assert.fail("next must not run"));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: "Unauthorized" });
});
