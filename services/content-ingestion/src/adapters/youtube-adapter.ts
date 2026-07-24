import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import {
  CollectResult,
  NormalizedItemV1,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { secureFetchText } from '../crawler/secure-fetch';
import { SourceAdapter } from './source-adapter';

const HIGHLIGHT_KEYWORDS = [
  'highlight',
  'highlights',
  'match highlight',
  'extended highlight',
  'all goals',
  'full match',
  'bàn thắng',
  'tóm tắt',
  'trận đấu',
  'vòng',
  'goals & highlights',
];

export class YouTubeAdapter implements SourceAdapter {
  readonly provider = 'youtube';
  readonly configVersion = 1;

  supports(source: SourceDescriptor): boolean {
    const provider = source.provider?.toLowerCase();
    const url = source.feedUrl?.toLowerCase() || '';
    return (
      provider === 'youtube' ||
      url.includes('youtube.com/feeds/videos.xml') ||
      url.includes('youtube.com/channel')
    );
  }

  async collect(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 30,
  ): Promise<CollectResult> {
    if (!source.feedUrl) {
      return this.emptyResult(checkpoint);
    }

    try {
      const fetchResponse = await secureFetchText(source.feedUrl, { timeoutMs: 15000 });
      const $ = cheerio.load(fetchResponse.body, { xmlMode: true });
      const entries = $('entry').toArray().slice(0, maxItems);

      const items: NormalizedItemV1[] = [];
      let skippedCount = 0;

      for (const node of entries) {
        const $entry = $(node);
        const videoId = $entry.children('yt\\:videoId, videoId').text().trim() ||
                        $entry.children('id').text().trim().replace(/^.*:/, '');
        const rawTitle = $entry.children('title').text().trim();
        const description = $entry.find('media\\:description, description').text().trim() ||
                            $entry.children('summary').text().trim();
        const thumbnailUrl = $entry.find('media\\:thumbnail').attr('url') ||
                             (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined);
        const publishedAt = $entry.children('published, updated').text().trim() || new Date().toISOString();
        const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : $entry.children('link').attr('href') || source.feedUrl;

        // Ponytail highlight filtering logic: Keep ONLY Match Highlights!
        if (!this.isHighlightVideo(rawTitle, description)) {
          skippedCount++;
          continue;
        }

        const title = `[Highlight] ${this.stripHtml(rawTitle)}`;
        const identityKey = `youtube:${source.id}:${videoId || this.sha256(rawTitle)}`;
        const revisionFingerprint = this.sha256(`${title}:${description}:${thumbnailUrl}`);

        items.push({
          schemaVersion: 1,
          idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
          identityKey,
          revisionFingerprint,
          connectorId: source.id,
          provider: 'youtube',
          externalId: videoId,
          contentType: 'VIDEO',
          originalUrl: videoUrl,
          canonicalUrl: videoUrl,
          title,
          description: this.limitText(this.stripHtml(description), 500),
          author: {
            name: source.name,
          },
          media: [
            {
              type: 'VIDEO',
              url: videoUrl,
              thumbnailUrl,
              providerMediaId: videoId,
            },
          ],
          language: 'en',
          publishedAt: new Date(publishedAt).toISOString(),
          collectedAt: new Date().toISOString(),
        });
      }

      const newCheckpoint: ProviderCheckpoint = {
        etag: checkpoint?.etag,
        lastModified: checkpoint?.lastModified,
        cursor: items[0]?.externalId || checkpoint?.cursor,
      };

      return {
        items,
        checkpoint: newCheckpoint,
        notModified: false,
        stats: {
          seenCount: entries.length,
          skippedMissingTitleCount: skippedCount,
          missingMediaCount: 0,
          invalidMediaCount: 0,
          duplicateIdentityCount: 0,
        },
      };
    } catch (err: any) {
      console.warn(`[YouTubeAdapter] Failed to fetch feed for source #${source.id}:`, err?.message || err);
      return this.emptyResult(checkpoint);
    }
  }

  private isHighlightVideo(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase();
    return HIGHLIGHT_KEYWORDS.some(keyword => text.includes(keyword));
  }

  private emptyResult(checkpoint?: ProviderCheckpoint): CollectResult {
    return {
      items: [],
      checkpoint: checkpoint || {},
      notModified: true,
      stats: {
        seenCount: 0,
        skippedMissingTitleCount: 0,
        missingMediaCount: 0,
        invalidMediaCount: 0,
        duplicateIdentityCount: 0,
      },
    };
  }

  private stripHtml(html: string): string {
    return String(html || '').replace(/<[^>]*>?/gm, '').trim();
  }

  private limitText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + '...';
  }

  private sha256(val: string): string {
    return createHash('sha256').update(val).digest('hex');
  }
}
