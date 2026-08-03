import { createHash } from 'node:crypto';
import {
  CollectResult,
  NormalizedItemV1,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';
import { secureFetchText } from '../crawler/secure-fetch';
import { SourceAdapter } from './source-adapter';

const HIGHLIGHT_TITLE_PATTERN = /highlights?|all goals|goals?|tóm tắt|trận đấu|vs|recap|review|matchday|full match|draw|victory|win|league|cup|analysis|top|best/i;

interface YouTubeChannelResponse {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: { uploads?: string };
    };
  }>;
  error?: { message?: string };
}

interface YouTubePlaylistItem {
  contentDetails?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: Record<string, { url?: string }>;
  };
  status?: { privacyStatus?: string };
}

interface YouTubePlaylistResponse {
  items?: YouTubePlaylistItem[];
  error?: { message?: string };
}

type FetchText = typeof secureFetchText;

export class YouTubeAdapter implements SourceAdapter {
  readonly provider = 'youtube';
  readonly configVersion = 2;
  private readonly uploadsPlaylistByChannel = new Map<string, string>();

  constructor(private readonly fetchText: FetchText = secureFetchText) {}

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
    checkpoint: ProviderCheckpoint = {},
    maxItems = 20,
  ): Promise<CollectResult> {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_DATA_API_KEY_MISSING');

    const channelId = this.extractChannelId(source.feedUrl);
    if (!channelId) throw new Error('YOUTUBE_CHANNEL_ID_MISSING');

    const uploadsPlaylistId = await this.resolveUploadsPlaylist(channelId, apiKey);
    const response = await this.fetchJson<YouTubePlaylistResponse>(
      this.apiUrl('playlistItems', {
        part: 'snippet,contentDetails,status',
        playlistId: uploadsPlaylistId,
        maxResults: String(Math.min(Math.max(maxItems, 1), 50)),
        key: apiKey,
      }),
    );

    const items: NormalizedItemV1[] = [];
    let skippedCount = 0;
    const entries = response.items || [];

    for (const entry of entries) {
      const snippet = entry.snippet || {};
      const videoId = entry.contentDetails?.videoId || snippet.resourceId?.videoId;
      const title = this.stripHtml(snippet.title || '');
      if (!videoId || entry.status?.privacyStatus === 'private' || entry.status?.privacyStatus === 'deleted') {
        skippedCount++;
        continue;
      }
      if (!title || !this.isHighlightVideo(title)) {
        skippedCount++;
        continue;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const description = this.limitText(this.stripHtml(snippet.description || ''), 500);
      const thumbnailUrl = this.thumbnailUrl(snippet.thumbnails, videoId);
      const identityKey = `youtube:${source.id}:${videoId}`;
      const normalizedTitle = `[Highlight] ${title}`;
      const revisionFingerprint = this.sha256(`${normalizedTitle}:${description}:${thumbnailUrl || ''}`);

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
        title: normalizedTitle,
        description,
        author: { name: source.name },
        media: [{
          type: 'VIDEO',
          url: videoUrl,
          thumbnailUrl,
          providerMediaId: videoId,
        }],
        language: 'en',
        publishedAt: this.safeDate(snippet.publishedAt),
        collectedAt: new Date().toISOString(),
      });
    }

    return {
      items,
      checkpoint: {
        ...checkpoint,
        cursor: items[0]?.externalId || checkpoint.cursor,
        configRevision: this.configVersion,
      },
      notModified: false,
      stats: {
        seenCount: entries.length,
        skippedMissingTitleCount: skippedCount,
        missingMediaCount: items.filter(item => item.media.length === 0).length,
        invalidMediaCount: 0,
        duplicateIdentityCount: 0,
      },
    };
  }

  private async resolveUploadsPlaylist(channelId: string, apiKey: string): Promise<string> {
    const cached = this.uploadsPlaylistByChannel.get(channelId);
    if (cached) return cached;

    const response = await this.fetchJson<YouTubeChannelResponse>(
      this.apiUrl('channels', { part: 'contentDetails', id: channelId, key: apiKey }),
    );
    const uploads = response.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error('YOUTUBE_UPLOADS_PLAYLIST_MISSING');
    this.uploadsPlaylistByChannel.set(channelId, uploads);
    return uploads;
  }

  private async fetchJson<T extends { error?: { message?: string } }>(url: string): Promise<T> {
    const response = await this.fetchText(url, { timeoutMs: 12_000 });
    if (response.statusCode < 200 || response.statusCode >= 300) {
      const error = new Error(`YOUTUBE_HTTP_${response.statusCode}`) as Error & { retryAfterMs?: number };
      const retryAfter = response.headers['retry-after'];
      const rawRetryAfter = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
      if (rawRetryAfter && /^\d+$/.test(rawRetryAfter)) error.retryAfterMs = Number(rawRetryAfter) * 1000;
      throw error;
    }

    const parsed = JSON.parse(response.body) as T;
    if (parsed.error) throw new Error(`YOUTUBE_API_ERROR:${parsed.error.message || 'UNKNOWN'}`);
    return parsed;
  }

  private apiUrl(resource: string, params: Record<string, string>): string {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  private extractChannelId(feedUrl: string): string | undefined {
    try {
      const url = new URL(feedUrl);
      const queryChannelId = url.searchParams.get('channel_id');
      if (queryChannelId) return queryChannelId;
      const match = url.pathname.match(/\/channel\/([^/]+)/i);
      return match?.[1];
    } catch {
      return undefined;
    }
  }

  private isHighlightVideo(title: string): boolean {
    return HIGHLIGHT_TITLE_PATTERN.test(title);
  }

  private thumbnailUrl(
    thumbnails: Record<string, { url?: string }> | undefined,
    videoId: string,
  ): string {
    return thumbnails?.maxres?.url
      || thumbnails?.high?.url
      || thumbnails?.medium?.url
      || thumbnails?.default?.url
      || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  private stripHtml(value: string): string {
    return String(value || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }

  private limitText(value: string, max: number): string {
    return value.length <= max ? value : `${value.substring(0, max - 3)}...`;
  }

  private safeDate(value?: string): string | undefined {
    if (!value) return undefined;
    const timestamp = Date.parse(value.trim());
    return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
