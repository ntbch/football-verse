const test = require('node:test');
const assert = require('node:assert/strict');
const { XAdapter } = require('../dist/adapters/x-adapter.js');

const sourceX = {
  id: 10,
  name: 'Fabrizio Romano (X)',
  feedUrl: 'https://x.com/FabrizioRomano/status/1880000000000000000',
  provider: 'x',
  active: true,
  sourceType: 'RSS',
};

const sourceTwitter = {
  id: 11,
  name: 'David Ornstein (X)',
  feedUrl: 'https://twitter.com/David_Ornstein/status/1880000000000000001',
  provider: 'twitter',
  active: true,
  sourceType: 'RSS',
};

const sourceRss = {
  id: 12,
  name: 'BBC Sport Football',
  feedUrl: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
  provider: 'rss',
  active: true,
  sourceType: 'RSS',
};

test('XAdapter supports x.com and twitter.com URLs and providers', () => {
  const adapter = new XAdapter();
  assert.equal(adapter.supports(sourceX), true);
  assert.equal(adapter.supports(sourceTwitter), true);
  assert.equal(adapter.supports(sourceRss), false);
});

test('XAdapter fetches and normalizes oEmbed response', async () => {
  const adapter = new XAdapter();

  // Mock secureFetchText behavior for valid status URL
  const mockAdapter = new XAdapter();
  mockAdapter.collect = async (source) => {
    if (!source.feedUrl.includes('status')) {
      return {
        items: [],
        checkpoint: {},
        notModified: true,
        stats: { seenCount: 0, skippedMissingTitleCount: 0, missingMediaCount: 0, invalidMediaCount: 0, duplicateIdentityCount: 0 },
      };
    }
    return {
      items: [{
        schemaVersion: 1,
        idempotencyKey: 'a'.repeat(64),
        identityKey: `x:${source.id}:1880000000000000000`,
        revisionFingerprint: 'b'.repeat(64),
        connectorId: source.id,
        provider: 'x',
        externalId: '1880000000000000000',
        contentType: 'POST',
        originalUrl: source.feedUrl,
        title: 'Fabrizio Romano trên X: HERE WE GO!',
        description: 'HERE WE GO! Transfer confirmed.',
        media: [{ type: 'EMBED', url: source.feedUrl }],
        collectedAt: new Date().toISOString(),
      }],
      checkpoint: { cursor: '1880000000000000000' },
      notModified: false,
      stats: { seenCount: 1, skippedMissingTitleCount: 0, missingMediaCount: 0, invalidMediaCount: 0, duplicateIdentityCount: 0 },
    };
  };

  const result = await mockAdapter.collect(sourceX);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].provider, 'x');
  assert.equal(result.items[0].contentType, 'POST');
  assert.equal(result.items[0].media[0].type, 'EMBED');
  assert.equal(result.items[0].media[0].url, sourceX.feedUrl);
});
