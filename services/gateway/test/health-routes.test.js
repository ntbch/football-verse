const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const http = require('node:http');

const { createHealthRouter, healthRouter } = require('../dist/routes/health-routes');

function request(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request({ host: '127.0.0.1', port: address.port, path, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('health is public and metrics require the internal token', async () => {
  const app = express();
  app.use(healthRouter);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const expectedInternalToken = process.env.INTERNAL_TOKEN || 'dev-internal-token-change-me-in-production';

  try {
    const health = await request(server, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'UP');
    assert.equal(health.body.metrics, undefined);

    const readiness = await request(server, '/ready');
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.status, 'UP');

    const unauthorized = await request(server, '/metrics');
    assert.equal(unauthorized.status, 401);

    const metrics = await request(server, '/metrics', {
      'X-Internal-Token': expectedInternalToken,
    });
    assert.equal(metrics.status, 200);
    assert.ok(metrics.body.core);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('readiness reports a required dependency outage without failing liveness', async () => {
  const app = express();
  app.use(createHealthRouter(async () => false));
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const liveness = await request(server, '/health');
    assert.equal(liveness.status, 200);

    const readiness = await request(server, '/ready');
    assert.equal(readiness.status, 503);
    assert.equal(readiness.body.dependency, 'rate-limit-store');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
