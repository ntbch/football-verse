export interface EmbeddingProvider {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly dimensions: number;

  embed(texts: string[]): Promise<number[][]>;
}
