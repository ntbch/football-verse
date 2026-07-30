import { SourceDescriptor } from '../contracts/normalized-item';
import { RssAdapter } from './rss-adapter';
import { YouTubeAdapter } from './youtube-adapter';
import { GNewsAdapter } from './gnews-adapter';
import { RedditAdapter } from './reddit-adapter';
import { XAdapter } from './x-adapter';
import { SourceAdapter } from './source-adapter';

const adapters: SourceAdapter[] = [
  new YouTubeAdapter(),
  new GNewsAdapter(),
  new RedditAdapter(),
  new XAdapter(),
  new RssAdapter(),
];

export function adapterFor(source: SourceDescriptor): SourceAdapter | undefined {
  return adapters.find(adapter => adapter.supports(source));
}
