-- ============================================================================
-- Allein Platform — Messaging (WhatsApp + Telegram) support
-- ============================================================================
-- 1. Adds usage counters for WhatsApp and Telegram messages on profiles
-- 2. Adds telegram_chat_id to profiles for linking Telegram accounts
-- 3. Adds telegram as a lead_source option
-- ============================================================================

-- Add messaging counters to profiles
alter table public.profiles
  add column if not exists whatsapp_messages_count int not null default 0,
  add column if not exists telegram_messages_count int not null default 0,
  add column if not exists telegram_chat_id text;

create index if not exists profiles_telegram_chat_idx on public.profiles(telegram_chat_id)
  where telegram_chat_id is not null;

-- Add telegram as a lead source and post platform
alter type lead_source add value if not exists 'telegram';
alter type post_platform add value if not exists 'telegram';
