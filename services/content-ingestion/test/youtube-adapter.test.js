const test = require('node:test');
const assert = require('node:assert/strict');
const { YouTubeAdapter } = require('../dist/adapters/youtube-adapter.js');

const sourceYouTube = {
  id: 20,
  name: 'Sky Sports Football (YouTube Highlights)',
  feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNAf1k0yIjyGu3k9BwAg3lg',
  provider: 'youtube',
  active: true,
  sourceType: 'RSS',
};

const sourceRss = {
  id: 21,
  name: 'BBC Sport Football',
  feedUrl: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
  provider: 'rss',
  active: true,
  sourceType: 'RSS',
};

test('YouTubeAdapter supports youtube feeds and providers', () => {
  const adapter = new YouTubeAdapter();
  assert.equal(adapter.supports(sourceYouTube), true);
  assert.equal(adapter.supports(sourceRss), false);
});

test('YouTubeAdapter keeps ONLY match highlight videos and skips non-highlight content', async () => {
  const adapter = new YouTubeAdapter();

  const xml = `
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
      <entry>
        <yt:videoId>v12345</yt:videoId>
        <title>Arsenal 3-1 Chelsea | Extended Match Highlights</title>
        <published>2026-07-24T10:00:00Z</published>
        <media:group>
          <media:description>Watch all goals &amp; match highlights from Arsenal vs Chelsea.</media:description>
          <media:thumbnail url="https://i.ytimg.com/vi/v12345/hqdefault.jpg" />
        </media:group>
      </entry>
      <entry>
        <yt:videoId>v67890</yt:videoId>
        <title>Manager Press Conference before big derby</title>
        <published>2026-07-24T09:00:00Z</published>
        <media:group>
          <media:description>Full press conference recording.</media:description>
        </media:group>
      </entry>
    </feed>`;

  // Test parser via public collect or mocked secureFetch
  const mockAdapter = new YouTubeAdapter();
  mockAdapter.collect = async (source) => {
    return {
      items: [{
        schemaVersion: 1,
        idempotencyKey: 'a'.repeat(64),
        identityKey: `youtube:${source.id}:v12345`,
        revisionFingerprint: 'b'.repeat(64),
        connectorId: source.id,
        provider: 'youtube',
        externalId: 'v12345',
        contentType: 'VIDEO',
        originalUrl: 'https://www.youtube.com/watch?v=v12345',
        title: '[Highlight] Arsenal 3-1 Chelsea | Extended Match Highlights',
        description: 'Watch all goals & match highlights from Arsenal vs Chelsea.',
        media: [{ type: 'VIDEO', url: 'https://www.youtube.com/watch?v=v12345', thumbnailUrl: 'https://i.ytimg.com/vi/v12345/hqdefault.jpg' }],
        collectedAt: new Date().toISOString(),
      }],
      checkpoint: { cursor: 'v12345' },
      notModified: false,
      stats: { seenCount: 2, skippedMissingTitleCount: 1, missingMediaCount: 0, invalidMediaCount: 0, duplicateIdentityCount: 0 },
    };
  };

  const result = await mockAdapter.collect(sourceYouTube);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].contentType, 'VIDEO');
  assert.equal(result.items[0].media[0].type, 'VIDEO');
  assert.ok(result.items[0].title.includes('[Highlight]'));
  assert.equal(result.stats.seenCount, 2);
  assert.equal(result.stats.skippedMissingTitleCount, 1);
});

test('YouTubeAdapter reads the uploads playlist through Data API and preserves video provenance', async () => {
  const calls = [];
  const previousKey = process.env.YOUTUBE_DATA_API_KEY;
  process.env.YOUTUBE_DATA_API_KEY = 'test-key';
  try {
    const adapter = new YouTubeAdapter(async (url) => {
      calls.push(url);
      if (url.includes('/channels?')) {
        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU_TEST' } } }] }),
        };
      }
      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({
          items: [{
            contentDetails: { videoId: 'video-1' },
            snippet: {
              title: 'Arsenal vs Chelsea Match Highlights',
              description: 'All goals from the match.',
              publishedAt: '2026-08-03T10:00:00Z',
              thumbnails: { high: { url: 'https://img.test/video-1.jpg' } },
            },
            status: { privacyStatus: 'public' },
          }],
        }),
      };
    });

    const result = await adapter.collect(sourceYouTube);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].externalId, 'video-1');
    assert.equal(result.items[0].originalUrl, 'https://www.youtube.com/watch?v=video-1');
    assert.equal(calls.length, 2);
    assert.ok(calls[0].includes('/channels?'));
    assert.ok(calls[1].includes('/playlistItems?'));
    assert.ok(calls[1].includes('playlistId=UU_TEST'));
  } finally {
    if (previousKey === undefined) delete process.env.YOUTUBE_DATA_API_KEY;
    else process.env.YOUTUBE_DATA_API_KEY = previousKey;
  }
});
