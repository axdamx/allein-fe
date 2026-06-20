-- ============================================================================
-- Allein Platform — Initial Schema
-- ============================================================================
-- This migration sets up the full database foundation for the platform:
--   - profiles (plan, role, usage counters) — auto-created on signup
--   - agent_types + agents (config-driven agent system)
--   - conversations + messages (AI chat history)
--   - leads + deals + reminders (CRM module)
--   - documents + document_chunks (pgvector RAG knowledge base)
--   - posts + campaigns + analytics (Marketing Studio)
--   - usage_log (metered billing / limit enforcement)
--   - Row Level Security on every table
--   - Auto-create profile + set admin on trigger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- pgvector for document embeddings (RAG). If not enabled on dashboard,
-- uncomment after enabling via Dashboard → Database → Extensions.
create extension if not exists "vector";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type plan_tier as enum ('free', 'lite', 'pro', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('member', 'admin', 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_status as enum ('active', 'paused', 'draft', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_type_key as enum (
    'property', 'insurance', 'car_dealer', 'travel', 'sales', 'legal'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum (
    'new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_source as enum (
    'website', 'whatsapp', 'phone', 'email', 'social', 'referral', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum (
    'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reminder_status as enum ('pending', 'sent', 'snoozed', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum (
    'draft', 'generating', 'ready', 'scheduled', 'published', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_platform as enum (
    'instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'whatsapp', 'email'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('user', 'assistant', 'system', 'tool');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles — one row per auth.users, holds plan + role + usage
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  company       text,
  phone         text,

  plan          plan_tier not null default 'free',
  role          user_role not null default 'member',

  -- Usage counters (reset monthly by cron — Phase 6)
  agents_count          int not null default 0,
  conversations_count   int not null default 0,
  messages_count        int not null default 0,
  posts_count           int not null default 0,
  documents_count       int not null default 0,
  usage_reset_at        timestamptz not null default now(),

  -- Trial / billing
  trial_ends_at         timestamptz,
  subscription_id       text,
  subscription_status   text default 'inactive',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create index if not exists profiles_plan_idx on public.profiles(plan);
create index if not exists profiles_role_idx on public.profiles(role);

-- ============================================================================
-- agent_types — catalog of configurable agent templates (seeded)
-- ============================================================================
create table if not exists public.agent_types (
  key           agent_type_key primary key,
  label         text not null,
  description   text,
  icon          text,             -- lucide icon name
  accent_color  text default '#6366f1',
  system_prompt text not null,    -- base system prompt for this agent type
  default_tools jsonb not null default '[]'::jsonb,
  sidebar_items jsonb not null default '[]'::jsonb,  -- custom nav per type
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- agents — user-instantiated agents (one per agent_type per workspace)
-- ============================================================================
create table if not exists public.agents (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  type          agent_type_key not null references public.agent_types(key),
  name          text not null,
  status        agent_status not null default 'draft',
  config        jsonb not null default '{}'::jsonb,  -- tools, model, persona
  system_prompt text,   -- override of agent_types.system_prompt (nullable)
  model         text not null default 'deepseek-v4-pro',
  avatar_url    text,

  conversations_count int not null default 0,
  leads_count         int not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger agents_updated_at before update on public.agents
  for each row execute function public.set_updated_at();

create index if not exists agents_owner_idx on public.agents(owner_id);
create index if not exists agents_type_idx on public.agents(type);

-- ============================================================================
-- conversations — chat sessions between user and an agent
-- ============================================================================
create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'New conversation',
  summary     text,
  metadata    jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

create index if not exists conversations_owner_idx on public.conversations(owner_id);
create index if not exists conversations_agent_idx on public.conversations(agent_id);

-- ============================================================================
-- messages — individual messages within a conversation
-- ============================================================================
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            message_role not null,
  content         text not null,
  tool_calls      jsonb,                         -- tool invocations
  tool_results    jsonb,                         -- tool return values
  tokens_in       int default 0,
  tokens_out      int default 0,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_created_idx on public.messages(created_at);

-- ============================================================================
-- leads — CRM prospects captured by agents or manually
-- ============================================================================
create table if not exists public.leads (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  agent_id      uuid references public.agents(id) on delete set null,
  name          text not null,
  email         text,
  phone         text,
  company       text,
  source        lead_source not null default 'website',
  status        lead_status not null default 'new',
  value         numeric(12,2) default 0,
  notes         text,
  metadata      jsonb not null default '{}'::jsonb,
  tags          text[] not null default '{}',

  -- Pipeline position
  assigned_to   uuid references public.profiles(id),
  last_contacted_at timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create index if not exists leads_owner_idx on public.leads(owner_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_agent_idx on public.leads(agent_id);

-- ============================================================================
-- deals — opportunities moving through the pipeline
-- ============================================================================
create table if not exists public.deals (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  lead_id       uuid references public.leads(id) on delete set null,
  title         text not null,
  stage         deal_stage not null default 'lead',
  value         numeric(12,2) not null default 0,
  currency      text not null default 'USD',
  probability   int not null default 0 check (probability between 0 and 100),
  expected_close_date date,
  assigned_to   uuid references public.profiles(id),
  notes         text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

create index if not exists deals_owner_idx on public.deals(owner_id);
create index if not exists deals_stage_idx on public.deals(stage);

-- ============================================================================
-- reminders — follow-ups tied to leads/deals, sent via cron (Phase 6)
-- ============================================================================
create table if not exists public.reminders (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  lead_id       uuid references public.leads(id) on delete cascade,
  deal_id       uuid references public.deals(id) on delete cascade,
  title         text not null,
  description   text,
  due_at        timestamptz not null,
  channel       text not null default 'in_app',  -- in_app | email | whatsapp
  status        reminder_status not null default 'pending',
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

create index if not exists reminders_owner_idx on public.reminders(owner_id);
create index if not exists reminders_due_idx on public.reminders(due_at);
create index if not exists reminders_status_idx on public.reminders(status);

-- ============================================================================
-- documents — uploaded knowledge-base files for RAG (pgvector)
-- ============================================================================
create table if not exists public.documents (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  agent_id      uuid references public.agents(id) on delete set null,
  name          text not null,
  mime_type     text,
  size_bytes    bigint,
  storage_path  text,    -- Supabase Storage path
  status        text not null default 'pending',  -- pending|processing|ready|failed
  chunk_count   int not null default 0,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create index if not exists documents_owner_idx on public.documents(owner_id);

-- ============================================================================
-- document_chunks — vector embeddings for semantic search
-- ============================================================================
create table if not exists public.document_chunks (
  id            uuid primary key default uuid_generate_v4(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  chunk_index   int not null,
  embedding     vector(1536),   -- OpenAI text-embedding-3-small dim
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists chunks_document_idx on public.document_chunks(document_id);
create index if not exists chunks_owner_idx on public.document_chunks(owner_id);

-- HNSW index for fast semantic similarity search
create index if not exists chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Match function for RAG retrieval (cosine similarity)
-- ----------------------------------------------------------------------------
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter_owner_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    document_id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.document_chunks
  where filter_owner_id is null or owner_id = filter_owner_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================================
-- campaigns — marketing campaign groupings
-- ============================================================================
create table if not exists public.campaigns (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  status        text not null default 'draft',  -- draft|active|paused|completed
  start_date    date,
  end_date      date,
  budget        numeric(12,2),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create index if not exists campaigns_owner_idx on public.campaigns(owner_id);

-- ============================================================================
-- posts — marketing content items (generated by AI, scheduled, published)
-- ============================================================================
create table if not exists public.posts (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  campaign_id     uuid references public.campaigns(id) on delete set null,
  agent_id        uuid references public.agents(id) on delete set null,

  title           text,
  caption         text,
  body            text,
  hashtags        text[] not null default '{}',
  platform        post_platform not null default 'instagram',
  status          post_status not null default 'draft',

  media_url       text,
  media_type      text,   -- image | video | carousel | none

  scheduled_for   timestamptz,
  published_at    timestamptz,
  external_id     text,   -- platform's post id after publishing

  prompt          text,   -- original generation prompt
  generation_params jsonb not null default '{}'::jsonb,

  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create index if not exists posts_owner_idx on public.posts(owner_id);
create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_scheduled_idx on public.posts(scheduled_for)
  where status = 'scheduled';

-- ============================================================================
-- post_analytics — engagement metrics pulled by cron (Phase 6)
-- ============================================================================
create table if not exists public.post_analytics (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  platform      post_platform not null,
  impressions   int not null default 0,
  reach         int not null default 0,
  likes         int not null default 0,
  comments      int not null default 0,
  shares        int not null default 0,
  saves         int not null default 0,
  clicks        int not null default 0,
  recorded_at   timestamptz not null default now()
);

create index if not exists analytics_post_idx on public.post_analytics(post_id);
create index if not exists analytics_recorded_idx on public.post_analytics(recorded_at);

-- ============================================================================
-- usage_log — append-only metered usage for billing & limit enforcement
-- ============================================================================
create table if not exists public.usage_log (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  metric        text not null,   -- message | post | document | agent
  quantity      int not null default 1,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists usage_owner_idx on public.usage_log(owner_id);
create index if not exists usage_metric_idx on public.usage_log(metric);
create index if not exists usage_created_idx on public.usage_log(created_at);

-- ============================================================================
-- AUTOMATION: auto-create profile when a new auth.users row appears
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.agent_types       enable row level security;
alter table public.agents            enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.leads             enable row level security;
alter table public.deals             enable row level security;
alter table public.reminders         enable row level security;
alter table public.documents         enable row level security;
alter table public.document_chunks   enable row level security;
alter table public.campaigns         enable row level security;
alter table public.posts             enable row level security;
alter table public.post_analytics    enable row level security;
alter table public.usage_log         enable row level security;

-- Helper: is the current user an admin/owner?
create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

-- ---- profiles: users see own profile; admins see all ----
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---- agent_types: readable by everyone authenticated (catalog) ----
drop policy if exists "agent_types_select_authenticated" on public.agent_types;
create policy "agent_types_select_authenticated" on public.agent_types
  for select to authenticated using (is_active = true);

-- ---- Generic owner-based policies for all tenant tables ----
-- (each table: select/insert/update/delete restricted to owner_id = auth.uid(),
--  plus admins can see all)

do $$
declare
  t text;
  owner_tables text[] := array[
    'agents','conversations','leads','deals','reminders',
    'documents','document_chunks','campaigns','posts','usage_log'
  ];
begin
  foreach t in array owner_tables loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format(
      'create policy "%1$s_select" on public.%1$s for select using (owner_id = auth.uid() or public.is_admin())',
      t
    );
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$s for insert with check (owner_id = auth.uid())',
      t
    );
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format(
      'create policy "%1$s_update" on public.%1$s for update using (owner_id = auth.uid() or public.is_admin())',
      t
    );
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$s for delete using (owner_id = auth.uid() or public.is_admin())',
      t
    );
  end loop;
end $$;

-- ---- messages: access via conversation ownership ----
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );

-- ---- post_analytics: follows post ownership ----
drop policy if exists "post_analytics_select" on public.post_analytics;
create policy "post_analytics_select" on public.post_analytics
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_analytics.post_id
        and (p.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "post_analytics_insert" on public.post_analytics;
create policy "post_analytics_insert" on public.post_analytics
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_analytics.post_id
        and p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED: agent_types catalog (6 types per doc spec)
-- ============================================================================
insert into public.agent_types (key, label, description, icon, system_prompt, default_tools, sidebar_items, sort_order)
values
  ('property', 'Property Agent', 'Real estate lead qualification and property recommendations.', 'home',
   'You are a property consultant AI. Help users find properties, qualify leads, schedule viewings, and answer questions about listings. Be knowledgeable about real estate markets.',
   '["search_properties","schedule_viewing","qualify_lead"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Leads","to":"/crm/leads"},{"label":"Listings","to":"/listings"},{"label":"Appointments","to":"/appointments"}]'::jsonb,
   1),
  ('insurance', 'Insurance Agent', 'Insurance policy quotes, claims assistance, and renewals.', 'shield',
   'You are an insurance advisor AI. Help users understand coverage, get quotes, file claims, and compare policies. Always recommend appropriate coverage levels.',
   '["get_quote","file_claim","compare_policies"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Policies","to":"/policies"},{"label":"Claims","to":"/claims"},{"label":"Quotes","to":"/quotes"}]'::jsonb,
   2),
  ('car_dealer', 'Car Dealer Agent', 'Vehicle inventory, test drive scheduling, and financing options.', 'car',
   'You are an automotive sales AI. Help users find vehicles, compare models, schedule test drives, and explore financing. Be enthusiastic and knowledgeable about cars.',
   '["search_inventory","schedule_test_drive","calculate_financing"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Inventory","to":"/inventory"},{"label":"Financing","to":"/financing"},{"label":"Test Drives","to":"/test-drives"}]'::jsonb,
   3),
  ('travel', 'Travel Agent', 'Trip planning, bookings, and itinerary management.', 'plane',
   'You are a travel concierge AI. Help users plan trips, book flights and hotels, build itineraries, and discover destinations. Be inspiring and detail-oriented.',
   '["search_flights","book_hotel","build_itinerary"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Itineraries","to":"/itineraries"},{"label":"Bookings","to":"/bookings"},{"label":"Destinations","to":"/destinations"}]'::jsonb,
   4),
  ('sales', 'Sales Agent', 'Lead nurturing, outreach sequences, and deal progression.', 'trending-up',
   'You are a sales development AI. Help users nurture leads, write outreach emails, qualify opportunities, and move deals through the pipeline. Be persuasive and data-driven.',
   '["send_email","enrich_lead","log_activity"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Pipeline","to":"/crm/pipeline"},{"label":"Leads","to":"/crm/leads"},{"label":"Sequences","to":"/sequences"}]'::jsonb,
   5),
  ('legal', 'Legal Agent', 'Legal document review, FAQ, and matter intake.', 'scale',
   'You are a legal intake assistant AI. Help users understand legal processes, review documents for basic issues, schedule consultations, and intake matters. Always clarify you are not providing formal legal advice.',
   '["review_document","schedule_consult","intake_matter"]'::jsonb,
   '[{"label":"Dashboard","to":"/dashboard"},{"label":"Matters","to":"/matters"},{"label":"Documents","to":"/documents"},{"label":"Consults","to":"/consults"}]'::jsonb,
   6)
on conflict (key) do nothing;

-- ============================================================================
-- POST-MIGRATION: create profile for existing users & set test@gmail.com admin
-- ============================================================================
-- Backfill profiles for any auth.users that existed before the trigger
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Promote the developer's test account to owner (full admin) on Pro plan
update public.profiles
set role = 'owner', plan = 'pro'
where email = 'test@gmail.com';
