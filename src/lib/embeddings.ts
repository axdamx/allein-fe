/**
 * Local embedding model using Transformers.js (Xenova/all-MiniLM-L6-v2).
 *
 * This runs entirely on the server — no API key, no cost, no rate limits.
 * The model downloads once (~25MB) and is cached for subsequent runs.
 *
 * Output: 384-dimensional vectors for semantic similarity search (RAG).
 */
import {
  createSemaphore,
  readConcurrencyLimit,
} from '@/lib/concurrency.server'

// Singleton — the model loads once and is reused across all requests
type EmbeddingPipeline = (
  input: string | Array<string>,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>

let embedderPromise: Promise<EmbeddingPipeline> | null = null

const withEmbeddingPermit = createSemaphore(
  readConcurrencyLimit('EMBEDDING_MAX_CONCURRENCY', 1, 4),
)

const getEmbedder = async (): Promise<EmbeddingPipeline> => {
  if (!embedderPromise) {
    embedderPromise = import('@huggingface/transformers').then(
      async ({ env, pipeline }) => {
        env.allowLocalModels = false
        return (await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          { device: 'cpu' },
        )) as unknown as EmbeddingPipeline
      },
    )
  }
  return embedderPromise
}

/**
 * Generate a 384-dim embedding vector for a piece of text.
 * Uses mean pooling over token embeddings (standard for MiniLM).
 */
export const embed = async (text: string): Promise<number[]> => {
  return withEmbeddingPermit(async () => {
    const embedder = await getEmbedder()
    // pooling: 'mean' averages all token vectors into one sentence vector
    // normalize: true ensures cosine similarity works well
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  })
}

/**
 * Batch-embed multiple texts (more efficient for document chunking).
 */
export const embedBatch = async (texts: string[]): Promise<number[][]> => {
  if (!texts.length) return []

  return withEmbeddingPermit(async () => {
    const embedder = await getEmbedder()
    const output = await embedder(texts, { pooling: 'mean', normalize: true })
    // output.data is flat: [dim0_text0, ..., dim0_text1, ...]
    const data = output.data
    const dim = 384
    const results: number[][] = []
    for (let i = 0; i < texts.length; i++) {
      const start = i * dim
      results.push(Array.from(data.slice(start, start + dim)))
    }
    return results
  })
}
