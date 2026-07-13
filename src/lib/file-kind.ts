/**
 * Client-side file-kind detection for chat attachments.
 *
 * Browsers don't reliably populate `file.type` — on macOS, PDFs and some text
 * files report an empty string. This helper falls back to the filename
 * extension so the client-side guard matches the server's allowlist.
 *
 * The server re-validates with magic-byte sniffing (`validateUpload`), so this
 * is a UX guard only — never security.
 */

/** Accepted chat attachment kinds, matching the server allowlist. */
export type AcceptedFileKind = 'image' | 'pdf' | 'text' | null

const EXT_TO_KIND: Record<string, AcceptedFileKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  pdf: 'pdf',
  txt: 'text',
  csv: 'text',
  md: 'text',
  markdown: 'text',
  json: 'text',
}

/**
 * Determine whether a File is an accepted chat attachment, and what kind.
 * Returns `null` if the file is not acceptable.
 *
 * Checks `file.type` first; if empty/unset (common on macOS for PDFs), falls
 * back to the filename extension.
 */
export function getAcceptedFileKind(file: File): AcceptedFileKind {
  const mime = file.type
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('text/') || mime === 'application/json') return 'text'

  // Extension fallback for when the browser doesn't set file.type.
  const ext = (file.name.includes('.') ? file.name.split('.').pop() : '')?.toLowerCase() ?? ''
  return EXT_TO_KIND[ext] ?? null
}

/** Best-effort MIME string for an accepted kind, when the browser didn't supply one. */
export function mimeFromKind(kind: AcceptedFileKind, fileName: string): string {
  if (kind === 'image') {
    const ext = (fileName.split('.').pop() ?? '').toLowerCase()
    if (ext === 'png') return 'image/png'
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'webp') return 'image/webp'
    if (ext === 'gif') return 'image/gif'
    return 'image/png'
  }
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'text') {
    const ext = (fileName.split('.').pop() ?? '').toLowerCase()
    if (ext === 'csv') return 'text/csv'
    if (ext === 'md' || ext === 'markdown') return 'text/markdown'
    if (ext === 'json') return 'application/json'
    return 'text/plain'
  }
  return 'application/octet-stream'
}
