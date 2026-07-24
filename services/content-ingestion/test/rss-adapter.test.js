const test = require('node:test');
const assert = require('node:assert/strict');

const { parseRssEntries, parseRssFeed, retryAfterMs, RssAdapter } = require('../dist/adapters/rss-adapter.js');
const { computeItemKey } = require('../dist/spool.js');

const source = {
  id: 7,
  name: 'Example Football',
  feedUrl: 'https://example.com/feed.xml',
  active: true,
  sourceType: 'RSS',
  provider: 'rss',
};

test('RSS metadata normalization never requires article HTML', () => {
  const xml = `
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <item>
          <guid>story-123</guid>
          <title>Club confirms a new signing</title>
          <link>https://example.com/story?utm_source=feed</link>
          <description><![CDATA[<p>The club confirmed the transfer.</p>]]></description>
          <pubDate>Thu, 23 Jul 2026 08:00:00 GMT</pubDate>
          <media:thumbnail url="https://cdn.example.com/story.jpg" />
        </item>
      </channel>
    </rss>`;

  const [item] = parseRssEntries(source, xml, 10);
  assert.equal(item.schemaVersion, 1);
  assert.equal(item.externalId, 'story-123');
  assert.equal(item.originalUrl, 'https://example.com/story');
  assert.equal(item.description, 'The club confirmed the transfer.');
  assert.equal(item.media[0].url, 'https://cdn.example.com/story.jpg');
  assert.match(item.identityKey, /^rss:7:[a-f0-9]{64}$/);
  assert.equal(item.idempotencyKey.length, 64);
  assert.equal(computeItemKey(item.originalUrl, item), item.idempotencyKey);
  assert.equal('content' in item, false);
});

test('same identity with corrected metadata creates a new revision only', () => {
  const first = parseRssEntries(source, `
    <rss><channel><item>
      <guid>story-456</guid>
      <title>Transfer talks continue</title>
      <link>https://example.com/transfer</link>
      <description>Initial report</description>
    </item></channel></rss>`, 10)[0];
  const corrected = parseRssEntries(source, `
    <rss><channel><item>
      <guid>story-456</guid>
      <title>Transfer talks continue</title>
      <link>https://example.com/transfer</link>
      <description>Corrected report</description>
    </item></channel></rss>`, 10)[0];

  assert.equal(first.identityKey, corrected.identityKey);
  assert.notEqual(first.revisionFingerprint, corrected.revisionFingerprint);
  assert.notEqual(first.idempotencyKey, corrected.idempotencyKey);
});

test('Atom alternate links and IDs normalize through the same contract', () => {
  const [item] = parseRssEntries(source, `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>atom-1</id>
        <title>Match report</title>
        <link rel="alternate" href="https://example.com/match" />
        <summary>Home side won 2-0.</summary>
        <updated>2026-07-23T09:00:00Z</updated>
      </entry>
    </feed>`, 10);

  assert.equal(item.externalId, 'atom-1');
  assert.equal(item.originalUrl, 'https://example.com/match');
  assert.equal(item.modifiedAt, '2026-07-23T09:00:00.000Z');
});

test('RSS feed stats record malformed entries and duplicate identities without article requests', async () => {
  const parsed = parseRssFeed(source, `
    <rss><channel>
      <item><guid>same</guid><title>One</title><link>https://example.com/one</link></item>
      <item><guid>same</guid><title>Duplicate</title><link>https://example.com/two</link></item>
      <item><guid>missing-title</guid><link>https://example.com/three</link></item>
    </channel></rss>`, 10);

  assert.equal(parsed.items.length, 1);
  assert.deepEqual(parsed.stats, {
    seenCount: 3,
    skippedMissingTitleCount: 1,
    missingMediaCount: 1,
    invalidMediaCount: 0,
    duplicateIdentityCount: 1,
  });

  const requested = [];
  const adapter = new RssAdapter(async (url, options) => {
    requested.push({ url, options });
    return { statusCode: 304, headers: {}, body: '' };
  });
  const result = await adapter.collect(source, { etag: 'etag-1' });
  assert.equal(result.notModified, true);
  assert.equal(result.stats.seenCount, 0);
  assert.deepEqual(requested, [{
    url: source.feedUrl,
    options: { headers: { 'If-None-Match': 'etag-1' }, timeoutMs: 15000 },
  }]);
});

test('RSS adapter preserves timeout failures and malformed feeds produce no normalized item', async () => {
  const malformed = parseRssFeed(source, 'this is not an RSS or Atom document', 10);
  assert.deepEqual(malformed.items, []);
  assert.equal(malformed.stats.seenCount, 0);

  const adapter = new RssAdapter(async () => {
    const error = new Error('request timed out');
    error.code = 'ETIMEDOUT';
    throw error;
  });
  await assert.rejects(() => adapter.collect(source), { code: 'ETIMEDOUT' });
});

test('RSS feed separately tracks an invalid media URL', () => {
  const parsed = parseRssFeed(source, `
    <rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item>
      <guid>invalid-media</guid><title>Media test</title><link>https://example.com/media-test</link>
      <media:thumbnail url="javascript:alert(1)" />
    </item></channel></rss>`, 10);

  assert.equal(parsed.items[0].media.length, 0);
  assert.equal(parsed.stats.missingMediaCount, 1);
  assert.equal(parsed.stats.invalidMediaCount, 1);
});

test('RSS 429 preserves Retry-After for source-level backoff', async () => {
  const adapter = new RssAdapter(async () => ({
    statusCode: 429,
    headers: { 'retry-after': '120' },
    body: '',
  }));

  await assert.rejects(() => adapter.collect(source), error => {
    assert.equal(error.code, 'RSS_HTTP_429');
    assert.equal(error.retryAfterMs, 120000);
    return true;
  });
  assert.equal(retryAfterMs('5'), 5000);
});

test('RSS 503 preserves an HTTP-date Retry-After for source-level backoff', async () => {
  const retryAt = new Date(Date.now() + 60_000).toUTCString();
  const adapter = new RssAdapter(async () => ({
    statusCode: 503,
    headers: { 'retry-after': retryAt },
    body: '',
  }));

  await assert.rejects(() => adapter.collect(source), error => {
    assert.equal(error.code, 'RSS_HTTP_503');
    assert.ok(error.retryAfterMs > 0);
    return true;
  });
});
