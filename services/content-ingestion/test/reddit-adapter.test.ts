import test from 'node:test';
import assert from 'node:assert/strict';
import { RedditAdapter } from '../src/adapters/reddit-adapter';
import { SourceDescriptor } from '../src/contracts/normalized-item';

test('RedditAdapter supports reddit provider and reddit.com URLs', () => {
  const adapter = new RedditAdapter();

  const sourceReddit: SourceDescriptor = {
    id: 1,
    name: 'Reddit r/soccer',
    feedUrl: 'https://www.reddit.com/r/soccer',
    provider: 'reddit',
    active: true,
  };

  const sourceOther: SourceDescriptor = {
    id: 2,
    name: 'BBC Sport',
    feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
    provider: 'rss',
    active: true,
  };

  assert.equal(adapter.supports(sourceReddit), true);
  assert.equal(adapter.supports(sourceOther), false);
});
