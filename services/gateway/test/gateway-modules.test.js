const assert = require("node:assert/strict");
const test = require("node:test");

const { requestIdMiddleware, cachePrivacyMiddleware } = require("../dist/middleware/security");
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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
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
