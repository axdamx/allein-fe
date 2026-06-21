/**
 * Text extraction + chunking for RAG document processing.
 *
 * Flow: raw file bytes → extract text → split into ~500-char chunks
 */
import { PDFParse } from 'pdf-parse'

/**
 * Extract plain text from common file types.
 * Supports: .txt, .md, .csv, .json (as text), and .pdf (via pdf-parse v2).
 *
 * @param content Raw file content (string for text files, base64 for PDF)
 * @param mimeType The file's MIME type
 * @param isBase64 Whether content is base64-encoded (true for binary files)
 */
export async function extractText(
  content: string,
  mimeType: string,
  isBase64 = false,
): Promise<string> {
  // PDF — use pdf-parse v2 (PDFParse class) for proper extraction
  if (mimeType.includes('pdf')) {
    try {
      const buffer = isBase64
        ? Buffer.from(content, 'base64')
        : Buffer.from(content, 'utf-8')

      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      await parser.destroy()
      return (result.text ?? '').trim()
    } catch (err) {
      throw new Error(
        `PDF parsing failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      )
    }
  }

  // Plain text formats — return as-is
  if (
    mimeType.includes('text') ||
    mimeType.includes('markdown') ||
    mimeType.includes('csv') ||
    mimeType.includes('json') ||
    mimeType === 'application/octet-stream'
  ) {
    return content
  }

  // Default: return as-is
  return content
}

/**
 * Split text into semantically meaningful chunks.
 *
 * Strategy:
 * 1. Split by paragraphs (double newlines)
 * 2. If a paragraph exceeds maxChunkSize, split by sentences
 * 3. Each chunk gets `overlap` chars of overlap with the previous chunk
 *
 * @param text Raw text to chunk
 * @param maxChunkSize Target size per chunk in chars (default 500)
 * @param overlap Overlap between chunks in chars (default 50)
 */
export function chunkText(
  text: string,
  maxChunkSize = 500,
  overlap = 50,
): string[] {
  if (!text.trim()) return []

  // Step 1: Split into paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    // If adding this paragraph keeps us under the limit, append it
    if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph
      continue
    }

    // Save current chunk if it has content
    if (currentChunk) {
      chunks.push(currentChunk)
    }

    // If the paragraph itself is too long, split by sentences
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/)
      let sentenceChunk = ''

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length + 1 <= maxChunkSize) {
          sentenceChunk = sentenceChunk
            ? `${sentenceChunk} ${sentence}`
            : sentence
        } else {
          if (sentenceChunk) chunks.push(sentenceChunk)
          sentenceChunk = sentence
        }
      }
      if (sentenceChunk) chunks.push(sentenceChunk)
      currentChunk = ''
    } else {
      // Start a new chunk with this paragraph
      currentChunk = paragraph
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk)
  }

  // Add overlap between consecutive chunks for better retrieval
  if (overlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [chunks[0]]
    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-overlap)
      overlapped.push(`${prevTail}...${chunks[i]}`)
    }
    return overlapped
  }

  return chunks
}
