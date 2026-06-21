/**
 * Local embedding model using Transformers.js (Xenova/all-MiniLM-L6-v2).
 *
 * This runs entirely on the server — no API key, no cost, no rate limits.
 * The model downloads once (~25MB) and is cached for subsequent runs.
 *
 * Output: 384-dimensional vectors for semantic similarity search (RAG).
 */
import { pipeline, env } from '@huggingface/transformers'

// Allow remote model download (cached after first run)
env.allowLocalModels = false

// Singleton — the model loads once and is reused across all requests
let embedderPromise: Promise<any> | null = null

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { device: 'cpu' },
    )
  }
  return embedderPromise
}

/**
 * Generate a 384-dim embedding vector for a piece of text.
 * Uses mean pooling over token embeddings (standard for MiniLM).
 */
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  // pooling: 'mean' averages all token vectors into one sentence vector
  // normalize: true ensures cosine similarity works well
  const output = await embedder(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

/**
 * Batch-embed multiple texts (more efficient for document chunking).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder()
  const output = await embedder(texts, { pooling: 'mean', normalize: true })
  // output.data is a flat Float32Array: [dim0_text0, dim1_text0, ..., dim0_text1, ...]
  const data = output.data as Float32Array
  const dim = 384
  const results: number[][] = []
  for (let i = 0; i < texts.length; i++) {
    const start = i * dim
    results.push(Array.from(data.slice(start, start + dim)))
  }
  return results
}
