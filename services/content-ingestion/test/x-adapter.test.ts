import test from 'node:test';
import assert from 'node:assert/strict';
import { XAdapter } from '../src/adapters/x-adapter';
import { SourceDescriptor } from '../src/contracts/normalized-item';

test('XAdapter supports x.com and twitter.com URLs and providers', () => {
  const adapter = new XAdapter();

  const sourceX: SourceDescriptor = {
    id: 1,
    name: 'Fabrizio Romano',
    feedUrl: 'https://x.com/FabrizioRomano/status/1880000000000000000',
    provider: 'x',
    active: true,
  };

  const sourceTwitter: SourceDescriptor = {
    id: 2,
    name: 'David Ornstein',
    feedUrl: 'https://twitter.com/David_Ornstein/status/1880000000000000001',
    provider: 'twitter',
    active: true,
  };

  const sourceRss: SourceDescriptor = {
    id: 3,
    name: 'BBC Sport',
    feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
    provider: 'rss',
    active: true,
  };

  assert.equal(adapter.supports(sourceX), true);
  assert.equal(adapter.supports(sourceTwitter), true);
  assert.equal(adapter.supports(sourceRss), false);
});
