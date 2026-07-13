/**
 * Shared attachment-extraction layer for chat.
 *
 * Both the Studio chat and the CRM agent chat route uploaded files through
 * `extractAttachment()`. It decides how the agent should "see" the file:
 *
 *   image (natural photo / screenshot) → vision part  (model looks at it)
 *   image (scanned doc / receipt)      → OCR → text    (tesseract.js)
 *   pdf / text file                    → text          (pdf-parse / passthrough)
 *
 * The result is fed into the agent.generate() turn by the chat server fn:
 *   - `image-url`  → push a { type: 'image' } part
 *   - `text`/`ocr` → append the text to the user message
 *
 * Security: every URL is run through `assertSafeUrl` before fetching (same
 * SSRF discipline as `studio-tools.ts`). Files are fetched server-side only.
 */
import { assertSafeUrl } from '@/lib/url-guard'
import { extractText } from '@/lib/chunking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExtractedAttachment =
  | { kind: 'text'; text: string; source: 'pdf' | 'text' | 'csv' | 'markdown' | 'json' }
  | { kind: 'ocr'; text: string; confidence: number }
  | { kind: 'image-url' }
  | { kind: 'error'; message: string }

export interface ExtractInput {
  /** Public or signed Storage URL of the already-uploaded file. */
  url: string
  /** Sniffed/validated MIME from `validateUpload` (trusted server-side). */
  mime: string
  /** Original filename — used for scan/receipt heuristic + error messages. */
  fileName: string
  /**
   * The user's message text, used to detect "scan this / read this / extract"
   * intent so a natural photo can be routed to OCR when the user clearly wants
   * the *text* out of it.
   */
  messageText?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap extracted text so a huge PDF can't blow the context window. */
const MAX_EXTRACTED_CHARS = 8000

/**
 * Filename / message patterns that suggest the user wants the *text* out of an
 * image (a scan, receipt, invoice, contract) rather than a visual description.
 * When matched, images route to OCR instead of vision.
 */
const SCAN_INTENT_PATTERNS = [
  /scan/i,
  /receipt/i,
  /invoice/i,
  /document/i,
  /contract/i,
  /form\b/i,
  /bill\b/i,
  /statement/i,
  /certificate/i,
  /license/i,
  /passport/i,
  /ic[\s_-]?card/i,
  /business[\s_-]?card/i,
]

const MESSAGE_INTENT_PATTERNS = [
  /\bread\b.*\b(this|the|attached|uploaded)\b/i,
  /\bscan\b/i,
  /\bextract\b/i,
  /\btranscribe\b/i,
  /\bocr\b/i,
  /\bwhat(?:'s|s| does| do) .* (?:say|show|read)/i,
]

// ---------------------------------------------------------------------------
// Fetch helper (SSRF-guarded)
// ---------------------------------------------------------------------------

async function fetchToBuffer(url: string): Promise<Buffer> {
  assertSafeUrl(url)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function looksLikeScan(fileName: string, messageText?: string): boolean {
  if (SCAN_INTENT_PATTERNS.some((re) => re.test(fileName))) return true
  if (messageText && MESSAGE_INTENT_PATTERNS.some((re) => re.test(messageText))) {
    return true
  }
  return false
}

function clampText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_EXTRACTED_CHARS) return trimmed
  // Keep the head + a truncation marker. For most receipts/invoices the
  // meaningful data is in the first page anyway.
  return `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n\n[...truncated, ${trimmed.length - MAX_EXTRACTED_CHARS} more chars...]`
}

// ---------------------------------------------------------------------------
// OCR (tesseract.js — lazily imported so it never loads on text/pdf paths)
// ---------------------------------------------------------------------------

async function ocrImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  // Lazy require: tesseract pulls in worker + wasm on first use. Avoiding the
  // import at module top keeps cold text/pdf turns fast.
  const { default: Tesseract } = await import('tesseract.js')
  const result = await Tesseract.recognize(buffer, 'eng')
  const text = (result?.data?.text ?? '').trim()
  // Average word confidence — 0..100. Low confidence (<40) usually means the
  // image wasn't actually text, surfaced to the caller for a graceful message.
  const confidence = result?.data?.confidence ?? 0
  return { text, confidence }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decide how the agent should ingest an attached file.
 *
 * Callers (chat server fns) then:
 *   - push a vision part for `image-url`, or
 *   - append the text to the user message for `text`/`ocr`.
 */
export async function extractAttachment(
  input: ExtractInput,
): Promise<ExtractedAttachment> {
  const { url, mime, fileName, messageText } = input
  const isImage = mime.startsWith('image/')

  // ── Images: vision vs. OCR ──────────────────────────────────────────
  if (isImage) {
    // Natural photo / screenshot → let the model see it directly.
    if (!looksLikeScan(fileName, messageText)) {
      return { kind: 'image-url' }
    }
    // Looks like a scan/receipt → run OCR for accurate text extraction.
    try {
      const buffer = await fetchToBuffer(url)
      const { text, confidence } = await ocrImage(buffer)
      if (!text) {
        return {
          kind: 'error',
          message: 'OCR found no readable text in the image.',
        }
      }
      return { kind: 'ocr', text: clampText(text), confidence }
    } catch (err) {
      return {
        kind: 'error',
        message: `Could not read the image: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    }
  }

  // ── PDF → pdf-parse (existing, shared with the knowledge base) ──────
  if (mime === 'application/pdf') {
    try {
      const buffer = await fetchToBuffer(url)
      const base64 = buffer.toString('base64')
      const text = await extractText(base64, mime, true)
      if (!text.trim()) {
        return {
          kind: 'error',
          message:
            'No selectable text found in the PDF. It may be a scanned image — try uploading an image and asking to scan it.',
        }
      }
      return { kind: 'text', text: clampText(text), source: 'pdf' }
    } catch (err) {
      return {
        kind: 'error',
        message: `Could not read the PDF: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    }
  }

  // ── Plain text family → fetch + passthrough ────────────────────────
  if (
    mime.startsWith('text/') ||
    mime === 'application/json'
  ) {
    try {
      const buffer = await fetchToBuffer(url)
      const text = buffer.toString('utf-8')
      if (!text.trim()) {
        return { kind: 'error', message: 'The file appears to be empty.' }
      }
      const source = mime === 'application/json' ? ('json' as const)
        : mime === 'text/csv' ? ('csv' as const)
        : mime === 'text/markdown' ? ('markdown' as const)
        : ('text' as const)
      return { kind: 'text', text: clampText(text), source }
    } catch (err) {
      return {
        kind: 'error',
        message: `Could not read the file: ${err instanceof Error ? err.message : 'unknown error'}`,
      }
    }
  }

  // Unsupported type (e.g. video — shouldn't reach here through the chat path,
  // but guard anyway).
  return {
    kind: 'error',
    message: `Unsupported attachment type: ${mime}.`,
  }
}

/**
 * Build the inline text block appended to the user message when an attachment
 * is extracted to text/OCR. Centralises the framing so both chats present the
 * document the same way to the model.
 */
export function formatExtractedText(
  fileName: string,
  extracted: ExtractedAttachment,
): string {
  if (extracted.kind === 'text') {
    return `\n\n[Attached document "${fileName}" — extracted text]\n${extracted.text}`
  }
  if (extracted.kind === 'ocr') {
    const note =
      extracted.confidence < 40
        ? ' (low OCR confidence — some text may be inaccurate)'
        : ''
    return `\n\n[Attached image "${fileName}" — OCR text${note}]\n${extracted.text}`
  }
  return ''
}
