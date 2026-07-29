const test = require('node:test');
const assert = require('node:assert/strict');
const { buildClusteringText } = require('../dist/embedding/embedding-text.js');
const { DisabledEmbeddingProvider } = require('../dist/embedding/disabled-provider.js');

test('buildClusteringText constructs canonical query format with symmetric prefix', () => {
  const item = {
    schemaVersion: 2,
    idempotencyKey: 'a'.repeat(64),
    identityKey: 'test-id',
    revisionFingerprint: 'b'.repeat(64),
    connectorId: 1,
    provider: 'bbc',
    contentType: 'ARTICLE',
    originalUrl: 'https://bbc.com/sport/football/12345',
    title: 'Manchester United sign João Neves',
    description: 'Agreement reached with Benfica for midfielder.',
    media: [],
    collectedAt: new Date().toISOString()
  };

  const text = buildClusteringText(item);
  assert.ok(text.startsWith('query:'));
  assert.ok(text.includes('title: Manchester United sign João Neves'));
  assert.ok(text.includes('summary: Agreement reached with Benfica for midfielder.'));
  assert.ok(text.includes('publisher: bbc'));
});

test('DisabledEmbeddingProvider returns expected dimensions and zero vectors', async () => {
  const provider = new DisabledEmbeddingProvider();
  assert.strictEqual(provider.modelId, 'disabled');
  assert.strictEqual(provider.dimensions, 384);

  const vectors = await provider.embed(['query:\ntitle: Test']);
  assert.strictEqual(vectors.length, 1);
  assert.strictEqual(vectors[0].length, 0);
});
