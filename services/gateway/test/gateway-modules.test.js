const assert = require("node:assert/strict");
const test = require("node:test");

const { requestIdMiddleware, cachePrivacyMiddleware, browserSecurityHeaders, corsMiddleware } = require("../dist/middleware/security");
const { metricsMiddleware, getMetricsSummary } = require("../dist/middleware/metrics");
const { safeErrorHandler } = require("../dist/middleware/error-handler");

function responseStub() {
  const headers = {};
  let finishCallback = null;
  return {
    statusCode: 200,
    body: undefined,
    headers,
    setHeader(name, val) {
      headers[name.toLowerCase()] = val;
    },
    header(name, val) {
      this.setHeader(name, val);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {},
    on(event, cb) {
      if (event === 'finish') finishCallback = cb;
    },
    emitFinish() {
      if (finishCallback) finishCallback();
    }
  };
}

test("requestIdMiddleware injects X-Request-Id header", () => {
  const req = { headers: {} };
  const res = responseStub();
  let nextCalled = false;

  requestIdMiddleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.ok(req.headers["x-request-id"]);
  assert.equal(res.headers["x-request-id"], req.headers["x-request-id"]);
});

test("cachePrivacyMiddleware sets private, no-store for auth routes", () => {
  const req = { headers: {}, path: "/api/v1/auth/login" };
  const res = responseStub();

  cachePrivacyMiddleware(req, res, () => {});

  assert.equal(res.headers["cache-control"], "private, no-store");
  assert.equal(res.headers["pragma"], "no-cache");
});

test("corsMiddleware only allows the configured origin", () => {
  const allowed = responseStub();
  corsMiddleware({ headers: { origin: "http://localhost:3000" }, method: "GET" }, allowed, () => {});
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:3000");

  const rejected = responseStub();
  corsMiddleware({ headers: { origin: "https://attacker.pages.dev" }, method: "GET" }, rejected, () => {});
  assert.equal(rejected.headers["access-control-allow-origin"], undefined);

  const noOrigin = responseStub();
  corsMiddleware({ headers: {}, method: "GET" }, noOrigin, () => {});
  assert.equal(noOrigin.headers["access-control-allow-origin"], undefined);
  assert.equal(noOrigin.headers["access-control-allow-credentials"], undefined);
});

test("browser security headers are present", () => {
  const res = responseStub();
  browserSecurityHeaders({}, res, () => {});
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
});

test("metricsMiddleware records route group statistics", () => {
  const req = { path: "/matches/123" };
  const res = responseStub();

  metricsMiddleware(req, res, () => {});
  res.emitFinish();

  const summary = getMetricsSummary();
  assert.ok(summary.prediction);
  assert.ok(summary.prediction.requests >= 1);
});

test("safeErrorHandler hides stack traces and returns clean JSON", () => {
  const err = new Error("Connection failed");
  const req = { method: "GET", path: "/api/v1/users", headers: { "x-request-id": "test-req-123" } };
  const res = responseStub();

  safeErrorHandler(err, req, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal Gateway Error");
  assert.equal(res.body.requestId, "test-req-123");
});
