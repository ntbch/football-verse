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

function firstMedia($item: cheerio.Cheerio<any>): { media: NormalizedMedia[]; invalidMediaCount: number } {
  const mediaNode = $item.find('media\\:content, media\\:thumbnail, enclosure').filter((_, element) => {
    const node = $item.find(element);
    const type = (node.attr('type') || '').toLowerCase();
    const medium = (node.attr('medium') || '').toLowerCase();
    return !type || type.startsWith('image/') || type.startsWith('video/') || medium === 'image' || medium === 'video';
  }).first();

  if (mediaNode.length === 0) return { media: [], invalidMediaCount: 0 };
  const url = safeRemoteUrl(mediaNode.attr('url'));
  if (!url) return { media: [], invalidMediaCount: 1 };

  const type = (mediaNode.attr('type') || '').toLowerCase();
  const medium = (mediaNode.attr('medium') || '').toLowerCase();
  const mediaType = type.startsWith('video/') || medium === 'video' ? 'VIDEO' : 'IMAGE';
  return {
    media: [{ type: mediaType, url, thumbnailUrl: mediaType === 'IMAGE' ? url : undefined }],
    invalidMediaCount: 0,
  };
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
    return source.sourceType === 'RSS' && (!source.provider || source.provider.toLowerCase() === 'rss');
  }

  async collect(
    source: SourceDescriptor,
    checkpoint: ProviderCheckpoint = {},
    maxItems = 30,
  ): Promise<CollectResult> {
    if (!this.supports(source)) {
      throw new Error('RSS_ADAPTER_UNSUPPORTED_SOURCE');
    }

    const headers: Record<string, string> = {};
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
