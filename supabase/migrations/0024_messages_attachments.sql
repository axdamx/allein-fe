-- ============================================================================
-- 0024_messages_attachments.sql
-- Adds attachment columns to public.messages so CRM agent chat can store
-- file/document metadata alongside a user message, mirroring studio_messages.
--
-- `attachment_url`  → public Storage URL of the uploaded file (validated +
--                     sniffed server-side by validateUpload before storage).
-- `attachment_mime` → trusted MIME used by the extraction layer to route
--                     images (vision) vs pdf/text (extraction) vs scans (OCR).
-- `attachment_name` → original filename, shown in the message bubble + used
--                     for scan/receipt heuristics.
-- ============================================================================

alter table public.messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_name text;
