const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const http = require('node:http');

const { createRateLimitMiddleware } = require('../dist/middleware/rate-limit');
const { createReadProxyMiddleware } = require('../dist/read-proxy');
const { PROXY_ROUTE_INVENTORY } = require('../dist/proxy');

function responseStub() {
  const headers = {};
  return {
    statusCode: 200,
    body: undefined,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    headers,
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    }).on('error', reject);
  });
}

test('proxy route inventory keeps every public upstream mount explicit', () => {
  assert.deepEqual(PROXY_ROUTE_INVENTORY.map(route => route.mount), [
    '/api/v1/game', '/api/v1', '/matches', '/standings', '/game',
  ]);
  assert.equal(PROXY_ROUTE_INVENTORY.filter(route => route.upstream === 'career').every(route => route.auth === 'required'), true);
});

test('rate limiter returns 429 and resets after its bounded window', () => {
  let timestamp = 1_000;
  const middleware = createRateLimitMiddleware({ limit: 2, windowMs: 1_000, now: () => timestamp });
  const req = { method: 'GET', path: '/matches/today', ip: '127.0.0.2', headers: {}, socket: {} };

  for (let request = 0; request < 2; request += 1) {
    const res = responseStub();
    let next = false;
    middleware(req, res, () => { next = true; });
    assert.equal(next, true);
  }
  const limited = responseStub();
  middleware(req, limited, () => assert.fail('limited request must not continue'));
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.body.message, 'Too many requests');
  assert.equal(limited.headers['retry-after'], 1);

  timestamp = 2_001;
  const reset = responseStub();
  let continued = false;
  middleware(req, reset, () => { continued = true; });
  assert.equal(continued, true);
});

test('read proxy retries one transient socket failure without retrying the client', async () => {
  let attempts = 0;
  const upstream = http.createServer((req, res) => {
    attempts += 1;
    if (attempts === 1) {
      req.socket.destroy();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: req.url }));
  });
  const upstreamPort = await listen(upstream);
  const app = express();
  app.use(createReadProxyMiddleware({
    target: `http://127.0.0.1:${upstreamPort}`,
    rewrite: originalUrl => originalUrl,
    retries: 1,
    timeoutMs: 1_000,
  }));
  const gateway = http.createServer(app);
  const gatewayPort = await listen(gateway);

  try {
    const response = await get(`http://127.0.0.1:${gatewayPort}/matches/42?q=x`);
    assert.equal(response.status, 200);
    assert.equal(response.headers['x-gateway-retries'], '1');
    assert.deepEqual(JSON.parse(response.body), { ok: true, path: '/matches/42?q=x' });
    assert.equal(attempts, 2);
  } finally {
    await new Promise(resolve => gateway.close(resolve));
    await new Promise(resolve => upstream.close(resolve));
  }
});

test('read proxy maps exhausted dependency failures to safe 502 JSON', async () => {
  const unavailable = http.createServer();
  const unavailablePort = await listen(unavailable);
  await new Promise(resolve => unavailable.close(resolve));

  const app = express();
  app.use((req, _res, next) => { req.headers['x-request-id'] = 'dependency-test'; next(); });
  app.use(createReadProxyMiddleware({
    target: `http://127.0.0.1:${unavailablePort}`,
    rewrite: originalUrl => originalUrl,
    retries: 1,
    timeoutMs: 100,
  }));
  const gateway = http.createServer(app);
  const gatewayPort = await listen(gateway);
  try {
    const response = await get(`http://127.0.0.1:${gatewayPort}/standings`);
    assert.equal(response.status, 502);
    assert.equal(JSON.parse(response.body).message, 'Bad Gateway: Upstream service unavailable or timed out');
    assert.equal(response.body.includes('ECONNREFUSED'), false);
  } finally {
    await new Promise(resolve => gateway.close(resolve));
  }
});
