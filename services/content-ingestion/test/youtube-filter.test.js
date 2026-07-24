const test = require('node:test');
const assert = require('node:assert/strict');
const { YouTubeAdapter } = require('../dist/adapters/youtube-adapter.js');

test('YouTube filters only by title, not generic channel descriptions', () => {
  const adapter = new YouTubeAdapter();
  assert.equal(adapter.isHighlightVideo('Manager press conference'), false);
  assert.equal(adapter.isHighlightVideo('Arsenal 3-1 Chelsea | Extended Highlights'), true);
});
