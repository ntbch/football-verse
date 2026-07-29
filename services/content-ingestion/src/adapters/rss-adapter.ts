import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { SourceAdapter } from './source-adapter';
import {
  CollectResult,
  CollectionStats,
  NormalizedItemV1,
  NormalizedMedia,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { secureFetchText } from '../crawler/secure-fetch';
import { normalizeSourceUrl } from '../spool';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value.trim());
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function textFromHtml(value?: string): string | undefined {
  if (!value) return undefined;
  const text = cheerio.load(`<body>${value}</body>`)('body').text().replace(/\s+/g, ' ').trim();
  return text || undefined;
}

function limit(value: string | undefined, max: number): string | undefined {
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function safeRemoteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function upgradeRssImageUrl(url: string): string {
  if (!url) return url;
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('//')) cleanUrl = `https:${cleanUrl}`;
  if (cleanUrl.includes('ichef.bbci.co.uk')) {
    cleanUrl = cleanUrl.replace(/(\/ace\/(?:standard|ws)\/|\/news\/)\d+\//i, '$11024/');
  }
  if (cleanUrl.includes('365dm.com') || cleanUrl.includes('skysports.com')) {
    cleanUrl = cleanUrl.replace(/\/\d{2,4}x\d{2,4}\//i, '/1920x1080/');
  }
  if (cleanUrl.includes('googleusercontent.com') || cleanUrl.includes('ggpht.com')) {
    cleanUrl = cleanUrl.replace(/=(?:s|w)\d+(?:-h\d+)?(?:-[a-z0-9]+)*/i, '=w1600-h900');
  }
  if (cleanUrl.includes('/wp-content/uploads/')) {
    cleanUrl = cleanUrl.replace(/-\d{2,4}x\d{2,4}(?=\.(?:avif|jpe?g|png|webp)(?:[?#]|$))/i, '');
  }
  if (cleanUrl.includes('/alternates/')) {
    cleanUrl = cleanUrl.replace(/\/alternates\/s\d+b?\//i, '/alternates/s1200/');
  }
  return cleanUrl;
}

function firstMedia($item: cheerio.Cheerio<any>): { media: NormalizedMedia[]; invalidMediaCount: number } {
  const candidates = $item.find('media\\:content, media\\:thumbnail, enclosure').toArray().flatMap(element => {
    const node = $item.find(element);
    const type = (node.attr('type') || '').toLowerCase();
    const medium = (node.attr('medium') || '').toLowerCase();
    if (type && !type.startsWith('image/') && !type.startsWith('video/') && medium !== 'image' && medium !== 'video') {
      return [];
    }
    const rawUrl = safeRemoteUrl(node.attr('url'));
    if (!rawUrl) return [null];
    const url = upgradeRssImageUrl(rawUrl);
    const image = !type.startsWith('video/') && medium !== 'video';
    const content = element.tagName.toLowerCase() === 'media:content';
    const width = Number.parseInt(node.attr('width') || '0', 10) || 0;
    const height = Number.parseInt(node.attr('height') || '0', 10) || 0;
    return [{ url, image, content, area: width * height }];
  });

  const invalidMediaCount = candidates.filter(candidate => candidate === null).length;
  const best = candidates
    .filter((candidate): candidate is { url: string; image: boolean; content: boolean; area: number } => candidate !== null)
    .sort((a, b) => Number(b.image) - Number(a.image) || Number(b.content) - Number(a.content) || b.area - a.area)[0];

  if (best) {
    const mediaType = best.image ? 'IMAGE' : 'VIDEO';
    return { media: [{ type: mediaType, url: best.url, thumbnailUrl: mediaType === 'IMAGE' ? best.url : undefined }], invalidMediaCount };
  }

  // Fallback: extract img src from description or content:encoded
  const rawHtml = $item.children('description').text() + ' ' + $item.children('content\\:encoded').text();
  const imgMatch = rawHtml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    const url = safeRemoteUrl(upgradeRssImageUrl(imgMatch[1]));
    if (url) {
      return {
        media: [{ type: 'IMAGE', url, thumbnailUrl: url }],
        invalidMediaCount: 0,
      };
    }
  }

  return { media: [], invalidMediaCount };
}

function itemLink($item: cheerio.Cheerio<any>): string | undefined {
  const rssLink = $item.children('link').first().text().trim();
  const atomLink = $item.children('link[rel="alternate"], link:not([rel])').first().attr('href')?.trim();
  const raw = rssLink || atomLink;
  if (!raw) return undefined;
  try {
    return normalizeSourceUrl(raw);
  } catch {
    return undefined;
  }
}

export function parseRssEntries(source: SourceDescriptor, xml: string, maxItems: number): NormalizedItemV1[] {
  return parseRssFeed(source, xml, maxItems).items;
}

export function parseRssFeed(
  source: SourceDescriptor,
  xml: string,
  maxItems: number,
): { items: NormalizedItemV1[]; stats: CollectionStats } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries = $('item, entry').toArray().slice(0, maxItems);
  const provider = (source.provider || 'rss').trim().toLowerCase();
  const collectedAt = new Date().toISOString();
  const stats: CollectionStats = {
    seenCount: 0,
    skippedMissingTitleCount: 0,
    missingMediaCount: 0,
    invalidMediaCount: 0,
    duplicateIdentityCount: 0,
  };
  const identities = new Set<string>();
  const items: NormalizedItemV1[] = [];

  for (const element of entries) {
    stats.seenCount += 1;
    const $item = $(element);
    const originalUrl = itemLink($item);
    const title = limit(textFromHtml($item.children('title').first().text()), 500);
    if (!originalUrl || !title) {
      if (!title) stats.skippedMissingTitleCount += 1;
      continue;
    }

    const externalId = limit(textFromHtml(
      $item.children('guid').first().text() || $item.children('id').first().text(),
    ), 2000) || originalUrl;
    const description = limit(textFromHtml(
      $item.children('description').first().text()
      || $item.children('summary').first().text()
      || $item.children('content').first().text()
      || $item.children('content\\:encoded').first().text(),
    ), 5000);
    const authorName = limit(textFromHtml(
      $item.children('author').first().text()
      || $item.children('dc\\:creator').first().text(),
    ), 200);
    const publishedAt = safeDate(
      $item.children('pubDate').first().text()
      || $item.children('published').first().text()
      || $item.children('date').first().text(),
    );
    const modifiedAt = safeDate($item.children('updated').first().text()) || publishedAt;
    const mediaResult = firstMedia($item);
    const media = mediaResult.media;
    const identityKey = `${provider}:${source.id}:${sha256(externalId)}`;
    if (identities.has(identityKey)) {
      stats.duplicateIdentityCount += 1;
      continue;
    }
    identities.add(identityKey);
    if (media.length === 0) stats.missingMediaCount += 1;
    stats.invalidMediaCount += mediaResult.invalidMediaCount;
    const revisionFingerprint = sha256(JSON.stringify({
      title,
      description,
      media,
      modifiedAt,
    }));

    items.push({
      schemaVersion: 1,
      idempotencyKey: sha256(`${identityKey}\n${revisionFingerprint}`),
      identityKey,
      revisionFingerprint,
      connectorId: source.id,
      provider,
      externalId,
      contentType: 'ARTICLE',
      originalUrl,
      canonicalUrl: originalUrl,
      title,
      description,
      author: authorName ? { name: authorName } : undefined,
      media,
      publishedAt,
      modifiedAt,
      collectedAt,
    });
  }

  return { items, stats };
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function retryAfterMs(value?: string | string[]): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10) * 1000;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function rssHttpError(
  statusCode: number,
  headers: Record<string, string | string[] | undefined>,
): Error & { code: string; retryAfterMs?: number } {
  const error = new Error(`RSS_HTTP_${statusCode}`) as Error & { code: string; retryAfterMs?: number };
  error.code = `RSS_HTTP_${statusCode}`;
  if (statusCode === 429 || statusCode === 503) error.retryAfterMs = retryAfterMs(headers['retry-after']);
  return error;
}

export class RssAdapter implements SourceAdapter {
  readonly provider = 'rss';
  readonly configVersion = 1;

  constructor(private readonly fetchText = secureFetchText) {}

  supports(source: SourceDescriptor): boolean {
    const provider = (source.provider || 'rss').toLowerCase();
    return provider === 'rss' || source.sourceType === 'RSS' || source.sourceType === 'SITEMAP' || source.sourceType === 'HOMEPAGE';
  }

  async collect(
    source: SourceDescriptor,
    checkpoint: ProviderCheckpoint = {},
    maxItems = 30,
  ): Promise<CollectResult> {
    if (!this.supports(source)) {
      throw new Error('RSS_ADAPTER_UNSUPPORTED_SOURCE');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FootballVerse/1.0',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    };
    if (checkpoint.etag) headers['If-None-Match'] = checkpoint.etag;
    if (checkpoint.lastModified) headers['If-Modified-Since'] = checkpoint.lastModified;

    const response = await this.fetchText(source.feedUrl, { headers, timeoutMs: 15_000 });
    if (response.statusCode === 304) {
      return {
        items: [],
        checkpoint,
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
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw rssHttpError(response.statusCode, response.headers);
    }

    const parsed = parseRssFeed(source, response.body, maxItems);
    return {
      items: parsed.items,
      checkpoint: {
        etag: headerValue(response.headers, 'etag') || checkpoint.etag,
        lastModified: headerValue(response.headers, 'last-modified') || checkpoint.lastModified,
        configRevision: this.configVersion,
      },
      notModified: false,
      stats: parsed.stats,
    };
  }
}
