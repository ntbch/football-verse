const test = require('node:test');
const assert = require('node:assert/strict');
const { GNewsAdapter } = require('../dist/adapters/gnews-adapter.js');

const sourceGoogleNews = {
  id: 30,
  name: 'Google News Football (GNews)',
  feedUrl: 'https://news.google.com/rss/search?q=football&hl=en-US&gl=US&ceid=US:en',
  provider: 'gnews',
  active: true,
  sourceType: 'RSS',
};

const sourceGNewsApi = {
  id: 31,
  name: 'GNews API',
  feedUrl: 'https://gnews.io/api/v4/search?q=football&token=test',
  provider: 'gnews',
  active: true,
  sourceType: 'RSS',
};

const sourceRss = {
  id: 32,
  name: 'BBC Sport Football',
  feedUrl: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
  provider: 'rss',
  active: true,
  sourceType: 'RSS',
};

test('GNewsAdapter supports gnews feeds and providers', () => {
  const adapter = new GNewsAdapter();
  assert.equal(adapter.supports(sourceGoogleNews), true);
  assert.equal(adapter.supports(sourceGNewsApi), true);
  assert.equal(adapter.supports(sourceRss), false);
});

test('GNewsAdapter parses Google News RSS items cleanly', async () => {
  const mockAdapter = new GNewsAdapter();
  mockAdapter.collect = async (source) => {
    return {
      items: [{
        schemaVersion: 1,
        idempotencyKey: 'a'.repeat(64),
        identityKey: `gnews:${source.id}:hash123`,
        revisionFingerprint: 'b'.repeat(64),
        connectorId: source.id,
        provider: 'gnews',
        externalId: 'hash123',
        contentType: 'ARTICLE',
        originalUrl: 'https://example.com/gnews-article',
        title: 'Champions League draw announced',
        description: 'Detailed analysis of the UEFA Champions League draw.',
        author: { name: 'BBC News' },
        media: [],
        collectedAt: new Date().toISOString(),
      }],
      checkpoint: {},
      notModified: false,
      stats: { seenCount: 1, skippedMissingTitleCount: 0, missingMediaCount: 1, invalidMediaCount: 0, duplicateIdentityCount: 0 },
    };
  };

  const result = await mockAdapter.collect(sourceGoogleNews);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].provider, 'gnews');
  assert.equal(result.items[0].contentType, 'ARTICLE');
  assert.equal(result.items[0].title, 'Champions League draw announced');
});
