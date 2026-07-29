import { EmbeddingProvider } from './embedding-provider';

/**
 * Embedding provider using @huggingface/transformers (ONNX runtime).
 * Loads intfloat/multilingual-e5-small locally for real 384-dim semantic embeddings.
 *
 * If the model fails to load (e.g. first run without cache, network issues),
 * falls back to a deterministic hash-based vector clearly labeled as 'hash-fallback'
 * so downstream code can distinguish real embeddings from placeholders.
 */
export class LocalTransformersEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 384;

  private pipelinePromise: Promise<any> | null = null;
  private _pipelineLoaded = false;

  get modelId(): string {
    return this._pipelineLoaded ? 'intfloat/multilingual-e5-small' : 'hash-fallback';
  }

  get modelVersion(): string {
    return this._pipelineLoaded ? 'v1.0' : 'none';
  }

  private async getPipeline() {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        try {
          const mod = await (Function('return import("@huggingface/transformers")')() as Promise<any>);
          const { pipeline, env } = mod;
          if (env) {
            // ponytail: allow remote download on first run so the model actually loads
            env.allowRemoteModels = process.env.ALLOW_REMOTE_MODELS !== 'false';
          }
          const pipe = await pipeline('feature-extraction', 'intfloat/multilingual-e5-small', {
            pooling: 'mean',
            normalize: true,
          });
          this._pipelineLoaded = true;
          console.log('[embedding] intfloat/multilingual-e5-small loaded via ONNX');
          return pipe;
        } catch (err) {
          console.warn('[embedding] Failed to load transformer model, using hash-fallback:', (err as Error).message);
          return null;
        }
      })();
    }
    return this.pipelinePromise;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline();
    if (pipe) {
      try {
        const results: number[][] = [];
        for (const text of texts) {
          const output = await pipe(text, { pooling: 'mean', normalize: true });
          const tensorData = Array.from(output.data as Float32Array);
          results.push(tensorData.slice(0, this.dimensions));
        }
        return results;
      } catch (err) {
        console.warn('[embedding] Inference error, falling back to hash:', (err as Error).message);
      }
    }
    return texts.map(text => this.fallbackEmbed(text));
  }

  private fallbackEmbed(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    if (tokens.length === 0) {
      vector[0] = 1.0;
      return vector;
    }
    for (const token of tokens) {
      let hash = 5381;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 33) ^ token.charCodeAt(i);
      }
      const idx = Math.abs(hash) % this.dimensions;
      vector[idx] += 1.0;
    }
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    } else {
      vector[0] = 1.0;
    }
    return vector;
  }
}
