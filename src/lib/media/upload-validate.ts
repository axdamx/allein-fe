/**
 * Server-side file upload validation.
 *
 * The client-side `accept="image/*"` + size check is trivially bypassed, so
 * the server must independently verify:
 *   1. Size cap — prevents storage-abuse / DoS.
 *   2. Extension allowlist — blocks .svg / .html / .htm (stored-XSS vectors
 *      when served from a public Storage URL).
 *   3. Magic-byte sniff — the declared MIME must match the actual content
 *      signature. Defeats extension/MIME spoofing.
 *
 * This is intentionally dependency-free; the supported types cover the studio
 * attachment use case (images + short clips).
 */

/** Max decoded upload size: 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Allowed (extension, mime, sniff-bytes) tuples. Order matters only for the
 * exported allowlist; sniffing is exact-match against the magic bytes.
 *
 * `sniff: []` means "no reliable magic bytes" (e.g. plain text) — these types
 * are accepted by extension + declared-MIME match alone, validated below.
 */
const ALLOWED: Array<{
  ext: string
  mime: string
  /** Offset then expected leading bytes. Empty = sniff skipped (text-like). */
  sniff: Array<[number, number[]]>
}> = [
  {
    ext: 'png',
    mime: 'image/png',
    sniff: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  },
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    sniff: [[0, [0xff, 0xd8, 0xff]]],
  },
  {
    ext: 'jpeg',
    mime: 'image/jpeg',
    sniff: [[0, [0xff, 0xd8, 0xff]]],
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    // "RIFF....WEBP"
    sniff: [
      [0, [0x52, 0x49, 0x46, 0x46]],
      [8, [0x57, 0x45, 0x42, 0x50]],
    ],
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    sniff: [[0, [0x47, 0x49, 0x46, 0x38]]], // GIF8
  },
  {
    ext: 'mp4',
    mime: 'video/mp4',
    // ftyp box starts at offset 4
    sniff: [[4, [0x66, 0x74, 0x79, 0x70]]],
  },
  {
    ext: 'webm',
    mime: 'video/webm',
    sniff: [[0, [0x1a, 0x45, 0xdf, 0xa3]]],
  },
  {
    ext: 'pdf',
    mime: 'application/pdf',
    // "%PDF-" header
    sniff: [[0, [0x25, 0x50, 0x44, 0x46]]],
  },
  {
    ext: 'txt',
    mime: 'text/plain',
    // No reliable magic bytes — accepted by extension + MIME match only.
    sniff: [],
  },
  {
    ext: 'csv',
    mime: 'text/csv',
    sniff: [],
  },
  {
    ext: 'md',
    mime: 'text/markdown',
    sniff: [],
  },
  {
    ext: 'json',
    mime: 'application/json',
    sniff: [],
  },
]

export const ALLOWED_EXTENSIONS = ALLOWED.map((a) => a.ext)

export interface ValidatedUpload {
  ext: string
  mime: string
  buffer: Buffer
}

export type UploadRejection =
  | { reason: 'too_large'; maxBytes: number }
  | { reason: 'bad_extension'; allowed: string[] }
  | { reason: 'bad_content' }

/**
 * Validate a decoded upload buffer. `fileName` and `declaredMime` come from
 * the client and are NOT trusted — only the magic bytes are.
 */
export function validateUpload(
  buffer: Buffer,
  fileName: string,
  declaredMime: string,
): ValidatedUpload | UploadRejection {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return { reason: 'too_large', maxBytes: MAX_UPLOAD_BYTES }
  }

  // 1. Extension from filename — allowlist check.
  const ext = (fileName.includes('.') ? fileName.split('.').pop() : '')?.toLowerCase() ?? ''
  const candidate = ALLOWED.find((a) => a.ext === ext)
  if (!candidate) {
    return { reason: 'bad_extension', allowed: ALLOWED_EXTENSIONS }
  }

  // 2. Magic-byte sniff — every (offset, bytes) pair must match.
  //    Types with no reliable magic bytes (text/* family) skip this step.
  if (candidate.sniff.length > 0) {
    const bytesOk = candidate.sniff.every(([offset, bytes]) => {
      for (let i = 0; i < bytes.length; i++) {
        if (buffer[offset + i] !== bytes[i]) return false
      }
      return true
    })
    if (!bytesOk) {
      return { reason: 'bad_content' }
    }
  }

  // 3. Declared MIME must be compatible with the sniffed type (defense in
  //    depth). Text-like types are a family — browsers report text/plain for
  //    .csv/.md/.json, so accept any text/* or application/json as compatible.
  if (declaredMime) {
    const dm = declaredMime.toLowerCase()
    const cm = candidate.mime
    const isTextFamily =
      cm.startsWith('text/') || cm === 'application/json'
    const declaredCompatible =
      dm === cm ||
      (isTextFamily && (dm.startsWith('text/') || dm === 'application/json'))
    if (!declaredCompatible) {
      return { reason: 'bad_content' }
    }
  }

  return { ext: candidate.ext, mime: candidate.mime, buffer }
}

/**
 * Human-readable message for a rejection — safe to return to the client
 * (no internal details).
 */
export function uploadRejectionMessage(rej: UploadRejection): string {
  switch (rej.reason) {
    case 'too_large':
      return `File is too large. Maximum size is ${Math.round(rej.maxBytes / (1024 * 1024))} MB.`
    case 'bad_extension':
      return `File type is not allowed. Allowed: ${rej.allowed.join(', ')}.`
    case 'bad_content':
      return 'File content does not match its type. The file may be corrupt or mislabeled.'
  }
}
