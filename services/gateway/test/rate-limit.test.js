const assert = require('node:assert/strict');
const test = require('node:test');

const { RedisRateLimitStore } = require('../dist/middleware/rate-limit');

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
