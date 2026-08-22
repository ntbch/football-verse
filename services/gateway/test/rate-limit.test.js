const assert = require('node:assert/strict');
const test = require('node:test');

const { MemoryRateLimitStore, RedisRateLimitStore, createRateLimitMiddleware } = require('../dist/middleware/rate-limit');

function redisClient({ ping = async () => 'PONG' } = {}) {
  return {
    on() {},
    eval: async () => [1, 60_000],
    ping,
    quit: async () => 'OK',
  };
}

test('RedisRateLimitStore exposes readiness without throwing on an unavailable Redis', async () => {
  const available = new RedisRateLimitStore('redis://unused', redisClient());
  assert.equal(await available.isReady(), true);

  const unavailable = new RedisRateLimitStore('redis://unused', redisClient({
    ping: async () => { throw new Error('connection refused'); },
  }));
  assert.equal(await unavailable.isReady(), false);
  await available.close();
});

function makeRes() {
  const res = { headers: {}, statusCode: null, body: null };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.status = (code) => { res.statusCode = code; return { json: (body) => { res.body = body; } }; };
  return res;
}

function callAuth(middleware, path, ip) {
  let nextCalled = false;
  const req = { method: 'POST', path, ip, socket: { remoteAddress: ip }, headers: {} };
  const res = makeRes();
  middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('auth credential endpoints use their own stricter bucket', () => {
  const middleware = createRateLimitMiddleware({
    limit: 100,
    windowMs: 60_000,
    authLimit: 2,
    store: new MemoryRateLimitStore(),
  });

  assert.equal(callAuth(middleware, '/api/v1/auth/login', '10.0.0.1').res.statusCode, null);
  assert.equal(callAuth(middleware, '/api/v1/auth/login', '10.0.0.1').res.statusCode, null);
  const blocked = callAuth(middleware, '/api/v1/auth/login', '10.0.0.1');
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.nextCalled, false);

  // Same IP on a normal core route is unaffected by the auth bucket.
  assert.equal(callAuth(middleware, '/api/v1/news', '10.0.0.1').res.statusCode, null);
});

test('rate limiter fails open when the store throws', () => {
  const middleware = createRateLimitMiddleware({
    limit: 10,
    windowMs: 60_000,
    now: () => Date.now(),
    store: { increment() { throw new Error('store down'); } },
  });

  const outcome = callAuth(middleware, '/api/v1/news', '10.0.0.2');
  assert.equal(outcome.nextCalled, true, 'request must pass through when the store is down');
  assert.equal(outcome.res.statusCode, null);
});
