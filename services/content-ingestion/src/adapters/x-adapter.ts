import { createHash } from 'node:crypto';
import {
  CollectResult,
  NormalizedItemV1,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { secureFetchText } from '../crawler/secure-fetch';
import { SourceAdapter } from './source-adapter';

interface TwitterOEmbedResponse {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  width?: number;
  height?: number;
  type: string;
  cache_age?: string;
  provider_name: string;
  provider_url: string;
  version: string;
}

export class XAdapter implements SourceAdapter {
  readonly provider = 'x';
  readonly configVersion = 1;

  supports(source: SourceDescriptor): boolean {
    const provider = source.provider?.toLowerCase();
    const url = source.feedUrl?.toLowerCase() || '';
    return (
      provider === 'x' ||
      provider === 'twitter' ||
      url.includes('x.com') ||
      url.includes('twitter.com')
    );
  }

  async collect(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 30,
  ): Promise<CollectResult> {
    const rawUrl = source.feedUrl;
    if (!rawUrl) {
      return this.emptyResult(checkpoint);
    }

    const tweetStatusMatch = rawUrl.match(/(?:x|twitter)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
    if (!tweetStatusMatch) {
      return this.emptyResult(checkpoint);
    }

    const username = tweetStatusMatch[1];
    const statusId = tweetStatusMatch[2];
    const oembedApiUrl = `https://publish.twitter.com/oEmbed?url=${encodeURIComponent(rawUrl)}&omit_script=true`;

    try {
      const fetchResponse = await secureFetchText(oembedApiUrl, { timeoutMs: 10000 });
      const data: TwitterOEmbedResponse = JSON.parse(fetchResponse.body);

      const plainText = this.stripHtml(data.html || '');
      const title = `${data.author_name || username} trên X: ${this.limitText(plainText, 80)}`;
      const identityKey = `x:${source.id}:${statusId}`;
      const revisionFingerprint = this.sha256(`${title}:${plainText}:${data.url}`);

      const normalizedItem: NormalizedItemV1 = {
        schemaVersion: 1,
        idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
        identityKey,
        revisionFingerprint,
        connectorId: source.id,
        provider: 'x',
        externalId: statusId,
        contentType: 'POST',
        originalUrl: data.url || rawUrl,
        canonicalUrl: data.url || rawUrl,
        title,
        description: plainText,
        author: {
          name: data.author_name || username,
          username: username,
        },
        media: [
          {
            type: 'EMBED',
            url: data.url || rawUrl,
          },
        ],
        language: 'en',
        publishedAt: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
      };

      const newCheckpoint: ProviderCheckpoint = {
        etag: checkpoint?.etag,
        lastModified: checkpoint?.lastModified,
        cursor: statusId,
      };

      return {
        items: [normalizedItem],
        checkpoint: newCheckpoint,
        notModified: false,
        stats: {
          seenCount: 1,
          skippedMissingTitleCount: 0,
          missingMediaCount: 0,
          invalidMediaCount: 0,
          duplicateIdentityCount: 0,
        },
      };
    } catch (err: any) {
      console.warn(`[XAdapter] Failed to fetch oEmbed for source #${source.id}:`, err?.message || err);
      return this.emptyResult(checkpoint);
    }
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
    return html.replace(/<[^>]*>?/gm, '').trim();
  }

  private limitText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + '...';
  }

  private sha256(val: string): string {
    return createHash('sha256').update(val).digest('hex');
  }
}
