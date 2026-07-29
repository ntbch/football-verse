export type NormalizedContentType = 'ARTICLE' | 'POST' | 'VIDEO' | 'PODCAST';
export type NormalizedMediaType = 'IMAGE' | 'VIDEO' | 'EMBED';

export interface NormalizedMedia {
  type: NormalizedMediaType;
  url?: string;
  thumbnailUrl?: string;
  providerMediaId?: string;
}

export interface NormalizedAuthor {
  name: string;
  username?: string;
}

export interface NormalizedItemV1 {
  schemaVersion: 1;
  idempotencyKey: string;
  identityKey: string;
  revisionFingerprint: string;
  connectorId: number;
  provider: string;
  externalId?: string;
  contentType: NormalizedContentType;
  originalUrl: string;
  canonicalUrl?: string;
  title?: string;
  description?: string;
  author?: NormalizedAuthor;
  media: NormalizedMedia[];
  language?: string;
  publishedAt?: string;
  modifiedAt?: string;
  collectedAt: string;
  metrics?: Record<string, number>;
}

export interface EmbeddingPayload {
  model: string;
  revision: string;
  dimensions: number;
  vector: number[];
}

export interface NormalizedItemV2 extends Omit<NormalizedItemV1, 'schemaVersion'> {
  schemaVersion: 2;
  embedding?: EmbeddingPayload;
}

export type NormalizedItem = NormalizedItemV1 | NormalizedItemV2;

export interface SourceDescriptor {
  id: number;
  name: string;
  feedUrl: string;
  active: boolean;
  sourceType: 'RSS' | 'SITEMAP' | 'HOMEPAGE';
  provider?: string;
  publisherName?: string;
  cssSelector?: string;
}

export interface ProviderCheckpoint {
  etag?: string;
  lastModified?: string;
  cursor?: string;
  configRevision?: number;
}

export interface CollectionStats {
  seenCount: number;
  skippedMissingTitleCount: number;
  missingMediaCount: number;
  invalidMediaCount: number;
  duplicateIdentityCount: number;
}

export interface CollectResult {
  items: NormalizedItemV1[];
  checkpoint: ProviderCheckpoint;
  notModified: boolean;
  stats: CollectionStats;
}
