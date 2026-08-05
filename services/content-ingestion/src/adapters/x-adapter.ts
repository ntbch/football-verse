import { createHash } from 'node:crypto';
import {
  CollectResult,
  NormalizedItemV1,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { getGotScraping } from '../crawler/got-helper';
import { SourceAdapter } from './source-adapter';

interface TwitterOEmbedResponse {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  type: string;
  provider_name: string;
}

interface XTweetData {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
}

interface XRecentSearchResponse {
  data?: XTweetData[];
  meta?: {
    result_count?: number;
  };
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
      url.includes('twitter.com') ||
      url.includes('x.com')
    );
  }

  async collect(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 20,
  ): Promise<CollectResult> {
    if (!source.feedUrl) {
      throw new Error('X_SOURCE_URL_MISSING');
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    const gotScraping = await getGotScraping();
    const items: NormalizedItemV1[] = [];
    const username = this.extractUsername(source.feedUrl) || source.name.replace(/\s+/g, '');

    // 1. If TWITTER_BEARER_TOKEN is available, try X API v2 recent search
    if (bearerToken) {
      try {
        const apiUrl = `https://api.twitter.com/2/tweets/search/recent?query=from:${encodeURIComponent(username)}&tweet.fields=created_at&max_results=${Math.min(maxItems, 50)}`;

        const response = await gotScraping({
          url: apiUrl,
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
          responseType: 'json',
          timeout: { request: 8000 },
        });

        const body = response.body as XRecentSearchResponse;
        const tweets = body?.data || [];

        for (const tweet of tweets) {
          const identityKey = `x:${source.id}:${tweet.id}`;
          const title = `${source.name}: ${tweet.text.slice(0, 100)}`;
          const revisionFingerprint = this.sha256(`${title}:${tweet.text}`);
          const tweetUrl = `https://x.com/${username}/status/${tweet.id}`;

          items.push({
            schemaVersion: 1,
            idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
            identityKey,
            revisionFingerprint,
            connectorId: source.id,
            provider: 'x',
            externalId: tweet.id,
            contentType: 'ARTICLE',
            originalUrl: tweetUrl,
            canonicalUrl: tweetUrl,
            title: title.slice(0, 500),
            description: tweet.text.slice(0, 5000),
            author: {
              name: source.name,
              username,
            },
            publishedAt: tweet.created_at || new Date().toISOString(),
            collectedAt: new Date().toISOString(),
            media: [],
            language: 'en',
          });
        }

        return this.buildResult(items, checkpoint, tweets.length);
      } catch (err) {
        throw err;
      }
    }

    // 2. Fallback to Twitter oEmbed if single status URL
    if (source.feedUrl.includes('/status/')) {
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(source.feedUrl)}`;
        const response = await gotScraping({
          url: oembedUrl,
          responseType: 'json',
          timeout: { request: 8000 },
        });

        const data = response.body as TwitterOEmbedResponse;
        if (data && data.html) {
          const rawText = data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const title = `${data.author_name || source.name}: ${rawText.slice(0, 100)}`;
          const identityKey = `x:${source.id}:${this.sha256(source.feedUrl)}`;
          const revisionFingerprint = this.sha256(`${title}:${rawText}`);

          items.push({
            schemaVersion: 1,
            idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
            identityKey,
            revisionFingerprint,
            connectorId: source.id,
            provider: 'x',
            externalId: this.sha256(source.feedUrl),
            contentType: 'ARTICLE',
            originalUrl: source.feedUrl,
            canonicalUrl: source.feedUrl,
            title: title.slice(0, 500),
            description: rawText.slice(0, 5000),
            author: {
              name: data.author_name || source.name,
              username: data.author_url ? data.author_url.split('/').pop() : undefined,
            },
            publishedAt: new Date().toISOString(),
            collectedAt: new Date().toISOString(),
            media: [],
            language: 'en',
          });
          return this.buildResult(items, checkpoint, 1);
        }
        if (items.length === 0) throw new Error('X_OEMBED_EMPTY');
      } catch (err) {
        throw err;
      }
    }

    throw new Error('X_API_TOKEN_MISSING');
  }

  extractStatusId(url: string): string | undefined {
    if (!url || !url.includes('/status/')) return undefined;
    try {
      const match = url.match(/\/status\/(\d+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private extractUsername(url: string): string | null {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    } catch {
      return null;
    }
  }

  private buildResult(items: NormalizedItemV1[], checkpoint?: ProviderCheckpoint, seenCount: number = 0): CollectResult {
    return {
      items,
      checkpoint: checkpoint || {},
      notModified: false,
      stats: {
        seenCount,
        skippedMissingTitleCount: 0,
        missingMediaCount: 0,
        invalidMediaCount: 0,
        duplicateIdentityCount: 0,
      },
    };
  }

  private sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}
