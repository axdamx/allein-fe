/**
 * Local Transformers.js embedding adapter for Mastra Memory.
 *
 * Implements the Mastra `EmbeddingModelV2` interface using the existing local
 * `embedBatch` pipeline (Xenova/all-MiniLM-L6-v2, 384-dim). This avoids the
 * OpenAI embedding dependency that Mastra's `ModelRouterEmbeddingModel`
 * requires — per AGENTS.md, OPENAI_API_KEY has no balance and all embeddings
 * must run locally via src/lib/embeddings.ts.
 *
 * Use this anywhere a Mastra Memory `embedder` is needed:
 *
 *   memory: new Memory({
 *     storage,
 *     vector: vectorStore,
 *     embedder: new LocalEmbedder(),
 *     ...
 *   })
 */
import { embedBatch } from '@/lib/embeddings'

const MODEL_ID = 'local/all-MiniLM-L6-v2'
const DIMENSIONS = 384

export class LocalEmbedder {
  readonly specificationVersion = 'v2' as const
  readonly modelId = MODEL_ID
  readonly provider = 'local'
  readonly maxEmbeddingsPerCall = 32
  readonly supportsParallelCalls = true

  /**
   * Embed an array of string values using the local Transformers.js pipeline.
   * Returns the shape the AI SDK v5 / Mastra expects: { embedding: number[][] }.
   */
  async doEmbed({ values }: { values: string[] }): Promise<{
    embeddings: number[][]
  }> {
    if (!values.length) return { embeddings: [] }
    const embeddings = await embedBatch(values)
    return { embeddings }
  }
}

/** Singleton — the underlying Transformers.js model loads once (~25MB) and is reused. */
export const localEmbedder = new LocalEmbedder()

export { DIMENSIONS as LOCAL_EMBEDDING_DIMENSIONS }
