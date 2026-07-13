-- ============================================================================
-- 0025_media_bucket_attachments.sql
--
-- Expands the `media` bucket's allowed_mime_types so chat attachments
-- (images + documents) can be stored alongside generated media.
--
-- Before this migration the bucket only accepted image/* and video/* MIME
-- types, so uploading a PDF or text file failed with HTTP 415
-- ("mime type application/pdf is not supported"). The chat feature needs to
-- store PDFs and plain-text-family files for extraction/OCR.
--
-- The server-side validateUpload() allowlist (src/lib/media/upload-validate.ts)
-- remains the first line of defense — Supabase is defense-in-depth here.
-- ============================================================================

update storage.buckets
  set allowed_mime_types = array[
    -- images (existing)
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    -- video (existing)
    'video/mp4',
    'video/webm',
    'video/quicktime',
    -- documents (chat attachments)
    'application/pdf',
    -- text family (chat attachments)
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json'
  ]
  where id = 'media';
