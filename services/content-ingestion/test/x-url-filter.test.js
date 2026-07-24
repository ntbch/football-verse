const test = require('node:test');
const assert = require('node:assert/strict');
const { XAdapter } = require('../dist/adapters/x-adapter.js');

test('X adapter rejects Google News article URLs as posts', () => {
  const adapter = new XAdapter();
  assert.equal(adapter.extractStatusId('https://news.google.com/rss/articles/example'), undefined);
  assert.equal(adapter.extractStatusId('https://x.com/FabrizioRomano/status/1880000000000000000'), '1880000000000000000');
});
