const test = require('node:test');
const assert = require('node:assert/strict');

const { RedditAdapter } = require('../dist/adapters/reddit-adapter.js');

test('RedditAdapter supports reddit provider and reddit.com URLs', () => {
  const adapter = new RedditAdapter();

  const sourceReddit = {
    id: 1,
    name: 'Reddit r/soccer',
    feedUrl: 'https://www.reddit.com/r/soccer',
    provider: 'reddit',
    active: true,
  };

  const sourceOther = {
    id: 2,
    name: 'BBC Sport',
    feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
    provider: 'rss',
    active: true,
  };

  assert.equal(adapter.supports(sourceReddit), true);
  assert.equal(adapter.supports(sourceOther), false);
});
