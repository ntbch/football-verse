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

interface GNewsApiArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

export class GNewsAdapter implements SourceAdapter {
  readonly provider = 'gnews';
  readonly configVersion = 1;

  supports(source: SourceDescriptor): boolean {
    const provider = source.provider?.toLowerCase();
    const url = source.feedUrl?.toLowerCase() || '';
    return (
      provider === 'gnews' ||
      provider === 'googlenews' ||
      url.includes('news.google.com') ||
      url.includes('gnews.io')
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

    // Check if it's GNews API (JSON) vs Google News RSS (XML)
    if (source.feedUrl.includes('gnews.io') || source.feedUrl.includes('/api/')) {
      return this.collectFromGNewsApi(source, checkpoint, maxItems);
    }

    return this.collectFromGoogleNewsRss(source, checkpoint, maxItems);
  }

  private async collectFromGoogleNewsRss(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 30,
  ): Promise<CollectResult> {
    try {
      const fetchResponse = await secureFetchText(source.feedUrl, { timeoutMs: 15000 });
      const $ = cheerio.load(fetchResponse.body, { xmlMode: true });
      const entries = $('item').toArray().slice(0, maxItems);

      const items: NormalizedItemV1[] = [];

      for (const node of entries) {
        const $item = $(node);
        const title = this.stripHtml($item.children('title').text());
        const rawLink = $item.children('link').text().trim();
        const rawDescription = $item.children('description').text();
        const rawContent = $item.children('content\\:encoded').text();
        const description = this.stripHtml(rawDescription);
        const pubDate = $item.children('pubDate').text().trim();
        const sourceName = $item.children('source').text().trim() || source.name;
        const guid = $item.children('guid').text().trim() || rawLink;
        const imageUrl = this.extractImageFromXml($, $item, rawDescription, rawContent);

        if (!title || !rawLink) continue;

        const identityKey = `gnews:${source.id}:${this.sha256(guid)}`;
        const revisionFingerprint = this.sha256(`${title}:${description}:${rawLink}`);

        items.push({
          schemaVersion: 1,
          idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
          identityKey,
          revisionFingerprint,
          connectorId: source.id,
          provider: 'gnews',
          externalId: this.sha256(guid),
          contentType: 'ARTICLE',
          originalUrl: rawLink,
          canonicalUrl: rawLink,
          title,
          description: this.limitText(description, 500),
          author: {
            name: sourceName,
          },
          media: imageUrl ? [{ type: 'IMAGE', url: imageUrl }] : [],
          language: 'en',
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          collectedAt: new Date().toISOString(),
        });
      }

      return {
        items,
        checkpoint: checkpoint || {},
        notModified: false,
        stats: {
          seenCount: entries.length,
          skippedMissingTitleCount: 0,
          missingMediaCount: items.length,
          invalidMediaCount: 0,
          duplicateIdentityCount: 0,
        },
      };
    } catch (err: any) {
      console.warn(`[GNewsAdapter] Failed to fetch Google News RSS for source #${source.id}:`, err?.message || err);
      return this.emptyResult(checkpoint);
    }
  }

  private async collectFromGNewsApi(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems: number = 30,
  ): Promise<CollectResult> {
    try {
      const fetchResponse = await secureFetchText(source.feedUrl, { timeoutMs: 15000 });
      const data = JSON.parse(fetchResponse.body);
      const articles: GNewsApiArticle[] = data.articles || [];

      const items: NormalizedItemV1[] = [];

      for (const article of articles.slice(0, maxItems)) {
        if (!article.title || !article.url) continue;

        const title = this.stripHtml(article.title);
        const description = this.stripHtml(article.description || article.content || '');
        const identityKey = `gnews:${source.id}:${this.sha256(article.url)}`;
        const revisionFingerprint = this.sha256(`${title}:${description}:${article.image}`);

        items.push({
          schemaVersion: 1,
          idempotencyKey: this.sha256(`${identityKey}:${revisionFingerprint}`),
          identityKey,
          revisionFingerprint,
          connectorId: source.id,
          provider: 'gnews',
          externalId: this.sha256(article.url),
          contentType: 'ARTICLE',
          originalUrl: article.url,
          canonicalUrl: article.url,
          title,
          description: this.limitText(description, 500),
          author: {
            name: article.source?.name || source.name,
          },
          media: article.image
            ? [
                {
                  type: 'IMAGE',
                  url: article.image,
                },
              ]
            : [],
          language: 'en',
          publishedAt: article.publishedAt || new Date().toISOString(),
          collectedAt: new Date().toISOString(),
        });
      }

      return {
        items,
        checkpoint: checkpoint || {},
        notModified: false,
        stats: {
          seenCount: articles.length,
          skippedMissingTitleCount: 0,
          missingMediaCount: items.filter(i => i.media.length === 0).length,
          invalidMediaCount: 0,
          duplicateIdentityCount: 0,
        },
      };
    } catch (err: any) {
      console.warn(`[GNewsAdapter] Failed to fetch GNews API for source #${source.id}:`, err?.message || err);
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
    return String(html || '').replace(/<[^>]*>?/gm, '').trim();
  }

  private limitText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + '...';
  }

  private extractImageFromXml($: cheerio.CheerioAPI, $item: cheerio.Cheerio<any>, description?: string, content?: string): string | undefined {
    const mediaUrl = $item.find('media\\:content, media\\:thumbnail, enclosure')
      .map((_, el) => $(el).attr('url') || $(el).attr('href'))
      .get()
      .find(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')));

    if (mediaUrl) {
      const url = mediaUrl.trim();
      return url.startsWith('//') ? `https:${url}` : url;
    }

    const rawHtml = `${description || ''} ${content || ''}`;
    
    // Match src attribute with http, https or protocol-relative //
    const imgMatch = rawHtml.match(/<img[^>]+src=["']((?:https?:)?\/\/[^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      let url = imgMatch[1].trim();
      if (url.startsWith('//')) {
        url = `https:${url}`;
      }
      if (!url.includes('favicon') && !url.includes('1x1') && !url.includes('google.com/images')) {
        return url;
      }
    }

    try {
      const $desc = cheerio.load(rawHtml);
      const descImg = $desc('img').toArray()
        .map(el => $desc(el).attr('src'))
        .find(src => src && (src.startsWith('http') || src.startsWith('//')) && !src.includes('favicon') && !src.includes('1x1'));

      if (descImg) {
        const url = descImg.trim();
        return url.startsWith('//') ? `https:${url}` : url;
      }
    } catch {}

    return undefined;
  }

  private sha256(val: string): string {
    return createHash('sha256').update(val).digest('hex');
  }
}
