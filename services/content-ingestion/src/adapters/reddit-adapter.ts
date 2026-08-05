import { createHash } from 'node:crypto';
import {
  CollectResult,
  NormalizedItemV1,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { getGotScraping } from '../crawler/got-helper';
import { SourceAdapter } from './source-adapter';

interface RedditPostData {
  id: string;
  title: string;
  selftext?: string;
  permalink: string;
  url?: string;
  author: string;
  created_utc: number;
  thumbnail?: string;
  over_18?: boolean;
}

interface RedditApiResponse {
  data?: {
    children?: Array<{
      data: RedditPostData;
    }>;
  };
}

export class RedditAdapter implements SourceAdapter {
  readonly provider = 'reddit';
  readonly configVersion = 1;

  supports(source: SourceDescriptor): boolean {
    const provider = source.provider?.toLowerCase();
    const url = source.feedUrl?.toLowerCase() || '';
    return provider === 'reddit' || url.includes('reddit.com');
  }

  async collect(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 20,
  ): Promise<CollectResult> {
    const feedUrl = source.feedUrl || 'https://www.reddit.com/r/soccer';
    let subreddit = 'soccer';
    if (feedUrl.includes('/r/')) {
      const parts = feedUrl.split('/r/')[1].split('/');
      if (parts[0]) subreddit = parts[0];
    }

    const gotScraping = await getGotScraping();
    const items: NormalizedItemV1[] = [];

    const accessToken = process.env.REDDIT_ACCESS_TOKEN;
    try {
      const jsonUrl = accessToken
        ? `https://oauth.reddit.com/r/${subreddit}/new.json?limit=${Math.min(maxItems, 50)}`
        : `https://www.reddit.com/r/${subreddit}/new.json?limit=${Math.min(maxItems, 50)}`;
      const response = await gotScraping({
        url: jsonUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        responseType: 'json',
        timeout: { request: 8000 },
      });

      const body = response.body as RedditApiResponse;
      const posts = body?.data?.children || [];

      for (const p of posts) {
        const post = p.data;
        if (!post || !post.title || post.over_18) continue;

        const identityKey = `reddit:${source.id}:${post.id}`;
        const rawText = (post.selftext && post.selftext.trim().length > 0) ? post.selftext : post.title;
        const revisionFingerprint = this.sha256(`${post.title}:${rawText}`);
        const originalUrl = post.permalink.startsWith('http')
          ? post.permalink
          : `https://www.reddit.com${post.permalink}`;

        const media = [];
        if (post.thumbnail && post.thumbnail.startsWith('http')) {
          media.push({ url: post.thumbnail, type: 'IMAGE' as const });
        }

        items.push({
          schemaVersion: 1,
          idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
          identityKey,
          revisionFingerprint,
          connectorId: source.id,
          provider: 'reddit',
          externalId: post.id,
          contentType: 'ARTICLE',
          originalUrl,
          canonicalUrl: originalUrl,
          title: post.title.slice(0, 500),
          description: rawText.slice(0, 5000),
          author: {
            name: post.author || 'Reddit User',
            username: post.author,
          },
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          collectedAt: new Date().toISOString(),
          media,
          language: 'en',
        });
      }

      return this.buildResult(items, checkpoint, posts.length);
    } catch (err: any) {
      throw err;
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
