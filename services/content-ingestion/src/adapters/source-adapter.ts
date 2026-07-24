import {
  CollectResult,
  ProviderCheckpoint,
  SourceDescriptor,
} from '../contracts/normalized-item';

export interface SourceAdapter {
  readonly provider: string;
  readonly configVersion: number;

  supports(source: SourceDescriptor): boolean;

  collect(
    source: SourceDescriptor,
    checkpoint?: ProviderCheckpoint,
    maxItems?: number,
  ): Promise<CollectResult>;
}
