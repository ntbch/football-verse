import { SourceDescriptor } from '../contracts/normalized-item';
import { RssAdapter } from './rss-adapter';
import { YouTubeAdapter } from './youtube-adapter';
import { GNewsAdapter } from './gnews-adapter';
import { SourceAdapter } from './source-adapter';

const adapters: SourceAdapter[] = [
  new YouTubeAdapter(),
  new GNewsAdapter(),
  new RssAdapter(),
];

export function adapterFor(source: SourceDescriptor): SourceAdapter | undefined {
  return adapters.find(adapter => adapter.supports(source));
}
