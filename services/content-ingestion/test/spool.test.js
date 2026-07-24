const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Test pure functions from compiled spool module or ts source
const { computeItemKey, calculateBackoffMs, isValidIngestionUrl, normalizeSourceUrl } = require('../dist/spool.js');
const {
  assertAllowedResponseContentType,
  assertResponseSize,
  assertSafeHttpUrl,
  isPublicIpAddress,
  MAX_CRAWL_RESPONSE_BYTES,
} = require('../dist/crawler/secure-fetch.js');

test('computeItemKey produces deterministic SHA-256 hex string', () => {
  const url = 'https://www.bbc.com/sport/football/123456';
  const key1 = computeItemKey(url);
  const key2 = computeItemKey(url);
  assert.equal(typeof key1, 'string');
  assert.equal(key1.length, 64);
  assert.equal(key1, key2);
});

test('item identity normalizes tracking parameters and includes corrected content', () => {
  const first = computeItemKey('HTTPS://Example.com:443/story?utm_source=x&b=2&a=1#top', { content: 'Hello   world' });
  const equivalent = computeItemKey('https://example.com/story?a=1&b=2', { content: 'Hello world' });
  const correction = computeItemKey('https://example.com/story?a=1&b=2', { content: 'Corrected world' });
  assert.equal(first, equivalent);
  assert.notEqual(first, correction);
  assert.equal(normalizeSourceUrl('https://EXAMPLE.com:443/story?utm_medium=social#x'), 'https://example.com/story');
});

test('normalized item identity uses its provider revision key', () => {
  const provided = 'a'.repeat(64);
  assert.equal(
    computeItemKey('https://example.com/story', { idempotencyKey: provided, description: 'metadata only' }),
    provided,
  );
});

test('calculateBackoffMs enforces bounded exponential backoff', () => {
  const b0 = calculateBackoffMs(0);
  const b1 = calculateBackoffMs(1);
  const b2 = calculateBackoffMs(2);
  const b10 = calculateBackoffMs(10);

  assert.equal(b0, 30000); // 30s
  assert.equal(b1, 120000); // 2m
  assert.equal(b2, 480000); // 8m
  assert.equal(b10, 3600000); // Capped at 1 hour
});

test('isValidIngestionUrl rejects local and SSRF-sensitive addresses', () => {
  assert.equal(isValidIngestionUrl('https://www.espn.com/soccer/news'), true);
  assert.equal(isValidIngestionUrl('http://127.0.0.1/admin'), false);
  assert.equal(isValidIngestionUrl('http://localhost:8080/internal'), false);
  assert.equal(isValidIngestionUrl('http://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isValidIngestionUrl('http://10.0.0.1/secret'), false);
  assert.equal(isValidIngestionUrl('http://172.17.0.1/secret'), false);
  assert.equal(isValidIngestionUrl('http://172.31.255.254/secret'), false);
  assert.equal(isValidIngestionUrl('http://[fc00::1]/secret'), false);
  assert.equal(isValidIngestionUrl('http://[fe80::1]/secret'), false);
  assert.equal(isValidIngestionUrl('https://user:secret@example.com/story'), false);
  assert.equal(isValidIngestionUrl('https://example.com:8443/story'), false);
  assert.equal(isValidIngestionUrl('invalid-url-string'), false);
});

test('socket address policy blocks private, documentation, and mapped addresses', () => {
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('172.32.0.1'), true);
  assert.equal(isPublicIpAddress('172.20.0.1'), false);
  assert.equal(isPublicIpAddress('100.64.0.1'), false);
  assert.equal(isPublicIpAddress('198.18.0.1'), false);
  assert.equal(isPublicIpAddress('::1'), false);
  assert.equal(isPublicIpAddress('2001:db8::1'), false);
  assert.equal(isPublicIpAddress('::ffff:127.0.0.1'), false);
  assert.throws(() => assertSafeHttpUrl('file:///etc/passwd'), /PROTOCOL_REJECTED/);
  assert.throws(() => assertSafeHttpUrl('https://localhost/redirect-target'), /HOST_REJECTED/);
});

test('feed response limits reject non-feed content and oversized bodies', () => {
  assert.doesNotThrow(() => assertAllowedResponseContentType(200, 'application/rss+xml; charset=utf-8'));
  assert.doesNotThrow(() => assertAllowedResponseContentType(304));
  assert.throws(() => assertAllowedResponseContentType(200, 'application/pdf'), /CONTENT_TYPE_REJECTED/);
  assert.doesNotThrow(() => assertResponseSize(MAX_CRAWL_RESPONSE_BYTES));
  assert.throws(() => assertResponseSize(MAX_CRAWL_RESPONSE_BYTES + 1), /RESPONSE_TOO_LARGE/);
});
