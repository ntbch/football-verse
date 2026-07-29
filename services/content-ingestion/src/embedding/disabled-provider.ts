import { EmbeddingProvider } from './embedding-provider';

export class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly modelId = 'disabled';
  readonly modelVersion = 'none';
  readonly dimensions = 384;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => []);
  }
}
