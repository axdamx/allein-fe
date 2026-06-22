# AgentFlow — Technical System Design v2.0

**Internal · Confidential**

Frontend · Database · Auth · Tier Gating · AI Agent · System Architecture  
Version 2.0 · Updated with Free / Lite / Pro / Custom tier plans · 2025

Internal engineering reference — includes tier gating, DB schema, FE flows, and system design.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Tier Plan — Feature Matrix & Limits](#2-tier-plan--feature-matrix--limits)
3. [Database Schema (Full)](#3-database-schema-full)
4. [Authentication & Account Flow](#4-authentication--account-flow)
5. [Frontend Architecture (TanStack Start)](#5-frontend-architecture-tanstack-start)
6. [Tier Gating on the Frontend](#6-tier-gating-on-the-frontend)
7. [Server Functions & API Layer](#7-server-functions--api-layer)
8. [AI Agent Layer (Mastra)](#8-ai-agent-layer-mastra)
9. [Marketing Studio Module](#9-marketing-studio-module)
10. [Background Jobs & Automation](#10-background-jobs--automation)
11. [System Architecture Diagram](#11-system-architecture-diagram)
12. [Environment Variables](#12-environment-variables)
13. [Railway Deployment](#13-railway-deployment)
14. [Decision Log](#14-decision-log)

---

## 1. Tech Stack Overview

Every layer — updated with marketing AI models.

Key architecture: **TanStack Start** (full-stack TypeScript) + **Mastra** (AI agent) + **Supabase** (DB + Auth + Storage + pgvector) + **DeepSeek V3** (LLM) + **GPT Image-1** (images) + **Kling 3.0** (video) + **Railway** (deploy). One language end-to-end. No Python service.

| Layer | Technology | Role | Why |
|---|---|---|---|
| Web framework | TanStack Start | Full-stack React + SSR + server functions | TypeScript-native, same ecosystem as Router/Query/Table |
| UI framework | React 19 + Vite | Component rendering, HMR | Fastest bundler, familiar stack |
| Routing | TanStack Router v2 | Type-safe file-based routing + layouts | Full type safety on params, loaders, search params |
| Server state | TanStack Query v5 | Fetching, caching, background sync | Replaces useEffect+fetch, cache invalidation built in |
| Tables | TanStack Table v8 | Leads, deals, reminders — headless | Sorting, filtering, pagination, zero UI lock-in |
| UI components | shadcn/ui + Tailwind | Pre-built accessible components | Copy-paste ownership, Radix primitives underneath |
| Auth | Supabase Auth | Email/password, JWT, invite flow, RLS | Ties directly to RLS auth.uid() — no extra service |
| Database | Supabase PostgreSQL | All structured data + RLS multi-tenancy | Managed Postgres, free tier covers early months |
| File storage | Supabase Storage | PDFs, generated images, videos | Same auth context, signed URLs, S3-compatible |
| Vector / RAG | pgvector on Supabase | RAG embeddings in same DB | No ChromaDB service needed, RLS applies automatically |
| AI agent | Mastra | Agent orchestration, tools, memory, streaming | TypeScript-native, replaces FastAPI + LangGraph |
| Chat LLM | DeepSeek V3 | Primary — chat, copy, captions, CRM queries | 50-60x cheaper than Claude Sonnet |
| LLM fallback | Claude Haiku | Complex drafting, nuanced tone copy | Better instruction following for brand-sensitive copy |
| Image gen | GPT Image-1 (OpenAI) | Marketing image generation | Best quality 2026, $0.04/image, commercial rights |
| Image fallback | DALL-E 3 | Image gen fallback | $0.02/image, same commercial rights |
| Video gen | Kling 3.0 | Short promotional video clips | $0.10/sec, best value 2026, audio included, 3-min max |
| Video fallback | Runway Gen-4.5 | Professional video with editing tools | Subscription model for power-user agencies |
| Embeddings | text-embedding-3-small | pgvector RAG embeddings | $0.0001/1k tokens, 1536 dimensions |
| Session memory | Redis (Upstash) | Conversation history, session state | Serverless, HTTP REST, free tier 10k cmds/day |
| Background jobs | Supabase Edge Functions | Cron, reminders, social post scheduler | Serverless, co-located with DB, free tier |
| WhatsApp | Twilio | Client-facing automated messaging | Webhook → server function → Mastra agent |
| Social publish | Meta Graph API | Facebook + Instagram auto-posting | Free API, supports images + Reels + carousels |
| Social publish | TikTok Content API | TikTok video auto-posting | Business account required, video only |
| Email | Resend | Transactional — invite, alerts, notifications | Best DX, React Email templates, 3k/mo free |
| Deployment | Railway | Single Node.js service | Full server needed for Mastra streaming |
| Monitoring | Railway logs + Sentry | Errors, performance, uptime | Add Sentry from month 2 onwards |

---

## 2. Tier Plan — Feature Matrix & Limits

Free · Lite · Pro · Custom — the source of truth.

This section is the single source of truth for what each plan includes. Every enforcement point in the codebase — DB, server functions, frontend gates — derives from these limits.

### 2.1 Plan Definitions

| Plan | Price | Target user | Key unlocks |
|---|---|---|---|
| free | RM0/mo | New agent exploring the platform | Basic AI chat, 10 leads, 1 doc, 3 posts — feel the value |
| lite | RM99/mo | Active agent who needs essentials but cost-conscious | More leads/docs, WhatsApp reminders, basic marketing posts |
| pro | RM249/mo | Full-time agent wanting full automation | Unlimited chat, social auto-post, video gen, all automation |
| custom | RM799+/mo | Agency or team of 5–50+ agents | Multi-seat, admin dashboard, white-label, custom config |

### 2.2 Full Limits Table

| Limit key | free | lite | pro | custom |
|---|---|---|---|---|
| ai_messages_per_day | 10 | 30 | unlimited | unlimited |
| leads_max | 10 | 100 | unlimited | unlimited |
| documents_max | 1 | 5 | 50 | unlimited |
| marketing_posts_per_month | 3 | 10 | 30 | unlimited |
| ai_images_per_month | 3 | 10 | 30 | unlimited |
| ai_videos_per_month | 0 | 0 | 5 | unlimited |
| whatsapp_reminders_per_month | 0 | 5 | unlimited | unlimited |
| whatsapp_broadcast | false | false | true | true |
| social_auto_post | false | false | true | true |
| drip_sequences | false | false | true | true |
| pipeline_kanban | false | true | true | true |
| deal_tracking | false | true | true | true |
| commission_forecast | false | false | true | true |
| csv_export | false | false | true | true |
| content_calendar | false | false | true | true |
| social_analytics | false | false | true | true |
| agent_seats | 1 | 1 | 1 | 5-50+ |
| admin_dashboard | false | false | false | true |
| white_label | false | false | false | true |
| api_access | false | false | false | true |

### 2.3 Plan Limits TypeScript Config

```ts
// src/config/plans.ts — single source of truth imported everywhere

export type PlanKey = "free" | "lite" | "pro" | "custom"

export interface PlanLimits {
  ai_messages_per_day:          number | "unlimited"
  leads_max:                    number | "unlimited"
  documents_max:                number | "unlimited"
  marketing_posts_per_month:    number | "unlimited"
  ai_images_per_month:          number | "unlimited"
  ai_videos_per_month:          number | "unlimited"
  whatsapp_reminders_per_month: number | "unlimited"
  whatsapp_broadcast:           boolean
  social_auto_post:             boolean
  drip_sequences:               boolean
  pipeline_kanban:              boolean
  deal_tracking:                boolean
  commission_forecast:          boolean
  csv_export:                   boolean
  content_calendar:             boolean
  social_analytics:             boolean
  agent_seats:                  number | "unlimited"
  admin_dashboard:              boolean
  white_label:                  boolean
  api_access:                   boolean
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    ai_messages_per_day: 10, leads_max: 10, documents_max: 1,
    marketing_posts_per_month: 3, ai_images_per_month: 3,
    ai_videos_per_month: 0, whatsapp_reminders_per_month: 0,
    whatsapp_broadcast: false, social_auto_post: false,
    drip_sequences: false, pipeline_kanban: false,
    deal_tracking: false, commission_forecast: false,
    csv_export: false, content_calendar: false,
    social_analytics: false, agent_seats: 1,
    admin_dashboard: false, white_label: false, api_access: false,
  },
  lite: {
    ai_messages_per_day: 30, leads_max: 100, documents_max: 5,
    marketing_posts_per_month: 10, ai_images_per_month: 10,
    ai_videos_per_month: 0, whatsapp_reminders_per_month: 5,
    whatsapp_broadcast: false, social_auto_post: false,
    drip_sequences: false, pipeline_kanban: true,
    deal_tracking: true, commission_forecast: false,
    csv_export: false, content_calendar: false,
    social_analytics: false, agent_seats: 1,
    admin_dashboard: false, white_label: false, api_access: false,
  },
  pro: {
    ai_messages_per_day: "unlimited", leads_max: "unlimited",
    documents_max: 50, marketing_posts_per_month: 30,
    ai_images_per_month: 30, ai_videos_per_month: 5,
    whatsapp_reminders_per_month: "unlimited",
    whatsapp_broadcast: true, social_auto_post: true,
    drip_sequences: true, pipeline_kanban: true,
    deal_tracking: true, commission_forecast: true,
    csv_export: true, content_calendar: true,
    social_analytics: true, agent_seats: 1,
    admin_dashboard: false, white_label: false, api_access: false,
  },
  custom: {
    ai_messages_per_day: "unlimited", leads_max: "unlimited",
    documents_max: "unlimited", marketing_posts_per_month: "unlimited",
    ai_images_per_month: "unlimited", ai_videos_per_month: "unlimited",
    whatsapp_reminders_per_month: "unlimited",
    whatsapp_broadcast: true, social_auto_post: true,
    drip_sequences: true, pipeline_kanban: true,
    deal_tracking: true, commission_forecast: true,
    csv_export: true, content_calendar: true,
    social_analytics: true, agent_seats: 50,
    admin_dashboard: true, white_label: true, api_access: true,
  },
}

export function getPlanLimits(plan: PlanKey): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function canUseFeature(plan: PlanKey, feature: keyof PlanLimits): boolean {
  const limit = PLAN_LIMITS[plan][feature]
  return limit === true || limit === "unlimited" || (typeof limit === "number" && limit > 0)
}
```

---

## 3. Database Schema (Full)

Full Supabase PostgreSQL schema with RLS — updated for all tiers.

### 3.1 Core User & Subscription Tables

```sql
-- ── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ── USERS ───────────────────────────────────────────────────
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  name         text,
  role         text default 'agent' check (role in ('admin','agent')),
  agent_type   text,
  plan         text default 'free' check (plan in ('free','lite','pro','custom')),
  plan_seats   int default 1,
  avatar_url   text,
  agency_id    uuid,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
create table public.subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  plan            text not null,
  billing_cycle   text default 'monthly' check (billing_cycle in ('monthly','annual')),
  status          text default 'active' check (status in ('active','cancelled','past_due','trialing')),
  started_at      timestamptz default now(),
  renews_at       timestamptz,
  cancelled_at    timestamptz,
  founding_member boolean default false,
  created_at      timestamptz default now()
);

-- ── USAGE TRACKING ───────────────────────────────────────────
create table public.usage (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid references public.users(id) on delete cascade,
  month                      date not null,
  ai_messages_count          int default 0,
  ai_messages_today          int default 0,
  ai_messages_today_reset    date default current_date,
  marketing_posts_count      int default 0,
  ai_images_count            int default 0,
  ai_videos_count            int default 0,
  whatsapp_reminders_count   int default 0,
  updated_at                 timestamptz default now(),
  unique (user_id, month)
);

-- ── CREDIT PACKS ─────────────────────────────────────────────
create table public.credit_packs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.users(id) on delete cascade,
  credits      int not null,
  credits_used int default 0,
  purchased_at timestamptz default now(),
  expires_at   timestamptz
);
```

### 3.2 Core Agent Data Tables

```sql
-- ── LEADS ───────────────────────────────────────────────────
create table public.leads (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid references public.users(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  source      text,
  status      text default 'new',
  notes       text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── DEALS ────────────────────────────────────────────────────
create table public.deals (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid references public.users(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  title           text not null,
  value           numeric,
  commission      numeric,
  stage           text not null,
  expected_close  date,
  closed_at       timestamptz,
  metadata        jsonb default '{}'
);

-- ── REMINDERS ────────────────────────────────────────────────
create table public.reminders (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid references public.users(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete set null,
  message     text not null,
  channel     text default 'whatsapp' check (channel in ('whatsapp','email','push')),
  due_at      timestamptz not null,
  sent_at     timestamptz,
  auto        boolean default false,
  created_at  timestamptz default now()
);

-- ── CONVERSATIONS ────────────────────────────────────────────
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid references public.users(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete set null,
  session_id  text not null,
  channel     text default 'dashboard' check (channel in ('dashboard','whatsapp')),
  messages    jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── DOCUMENTS ────────────────────────────────────────────────
create table public.documents (
  id           uuid primary key default uuid_generate_v4(),
  agent_id     uuid references public.users(id) on delete cascade,
  agent_type   text not null,
  filename     text not null,
  storage_path text not null,
  indexed_at   timestamptz,
  chunk_count  int,
  created_at   timestamptz default now()
);

-- ── DOCUMENT CHUNKS (pgvector) ───────────────────────────────
create table public.document_chunks (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid references public.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  agent_type  text not null,
  filename    text not null,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz default now()
);
create index on document_chunks using ivfflat (embedding vector_cosine_ops);
```

### 3.3 Marketing Studio Tables

```sql
-- ── MARKETING POSTS ─────────────────────────────────────────
create table public.marketing_posts (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid references public.users(id) on delete cascade,
  content_type    text check (content_type in ('image','video','text')),
  prompt          text,
  enhanced_prompt text,
  caption         text,
  hashtags        text[],
  media_url       text,
  media_type      text,
  platforms       text[],
  status          text default 'draft' check (status in ('draft','scheduled','published','failed')),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  image_model     text,
  video_model     text,
  credits_used    int default 0,
  created_at      timestamptz default now()
);

-- ── SOCIAL ACCOUNTS ──────────────────────────────────────────
create table public.social_accounts (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid references public.users(id) on delete cascade,
  platform        text check (platform in ('facebook','instagram','tiktok','linkedin')),
  account_name    text,
  account_id      text,
  access_token    text,
  token_expires   timestamptz,
  connected_at    timestamptz default now(),
  unique (agent_id, platform)
);

-- ── POST RESULTS ─────────────────────────────────────────────
create table public.post_results (
  id              uuid primary key default uuid_generate_v4(),
  post_id         uuid references public.marketing_posts(id) on delete cascade,
  agent_id        uuid references public.users(id) on delete cascade,
  platform        text,
  platform_post_id text,
  likes           int default 0,
  comments        int default 0,
  shares          int default 0,
  reach           int default 0,
  impressions     int default 0,
  published_at    timestamptz,
  metrics_at      timestamptz
);
```

### 3.4 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.reminders enable row level security;
alter table public.conversations enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.marketing_posts enable row level security;
alter table public.social_accounts enable row level security;
alter table public.post_results enable row level security;
alter table public.usage enable row level security;
alter table public.credit_packs enable row level security;

-- Agents see only their own rows
create policy "agent_owns_leads"           on public.leads           for all using (agent_id = auth.uid());
create policy "agent_owns_deals"           on public.deals           for all using (agent_id = auth.uid());
create policy "agent_owns_reminders"       on public.reminders       for all using (agent_id = auth.uid());
create policy "agent_owns_conversations"   on public.conversations   for all using (agent_id = auth.uid());
create policy "agent_owns_documents"       on public.documents       for all using (agent_id = auth.uid());
create policy "agent_owns_chunks"          on public.document_chunks for all using (agent_id = auth.uid());
create policy "agent_owns_posts"           on public.marketing_posts for all using (agent_id = auth.uid());
create policy "agent_owns_social"          on public.social_accounts for all using (agent_id = auth.uid());
create policy "agent_owns_post_results"    on public.post_results    for all using (agent_id = auth.uid());
create policy "agent_owns_usage"           on public.usage           for all using (user_id = auth.uid());
create policy "agent_owns_credits"         on public.credit_packs    for all using (user_id = auth.uid());

-- Admin bypass: admin routes use service role key which bypasses RLS entirely
```

### 3.5 Usage Helper Functions

```sql
-- Get or create usage row for current month
create or replace function get_usage(p_user_id uuid)
returns public.usage as $$
declare v_usage public.usage;
begin
  insert into public.usage (user_id, month)
  values (p_user_id, date_trunc('month', now())::date)
  on conflict (user_id, month) do nothing;
  select * into v_usage from public.usage
  where user_id = p_user_id and month = date_trunc('month', now())::date;
  -- reset today counter if date changed
  if v_usage.ai_messages_today_reset < current_date then
    update public.usage set ai_messages_today = 0,
    ai_messages_today_reset = current_date
    where user_id = p_user_id and month = date_trunc('month', now())::date;
    v_usage.ai_messages_today := 0;
  end if;
  return v_usage;
end; $$ language plpgsql security definer;

-- pgvector similarity search scoped by agent_id
create function match_chunks(query_embedding vector(1536), p_agent_id uuid, match_count int)
returns table(content text, similarity float) as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from public.document_chunks
  where agent_id = p_agent_id
  order by embedding <=> query_embedding
  limit match_count;
$$ language sql;
```

---

## 4. Authentication & Account Flow

Login, logout, roles, plan check — full flow.

### 4.1 Account Types and Roles

| Role | Plan options | What they can do | How created |
|---|---|---|---|
| agent | free, lite, pro | Own dashboard, own leads/docs/posts, own AI chat | Self-signup OR admin invite |
| agent | custom | As above + part of agency | Admin creates via invite |
| admin | n/a | All agents, all data (bypasses RLS), billing, config, agencies | Supabase dashboard or seed script |

### 4.2 Auth Flow — Self-Signup

```ts
// src/server/auth.ts — server functions

// 1. SIGN UP
export const signUp = createServerFn().handler(async ({ data }) => {
  const { email, password, name, agent_type } = data
  const { data: auth, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  await supabaseAdmin.from("users")
    .update({ name, agent_type, plan: "free" })
    .eq("id", auth.user!.id)
  return { user: auth.user }
})

// 2. LOGIN
export const signIn = createServerFn().handler(async ({ data }) => {
  const { email, password } = data
  const { data: session, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  setCookie("sb-session", JSON.stringify(session), { httpOnly: true, secure: true })
  const { data: user } = await supabase.from("users").select("*").eq("id", session.user.id).single()
  return { user, session }
})

// 3. LOGOUT
export const signOut = createServerFn().handler(async () => {
  await supabase.auth.signOut()
  deleteCookie("sb-session")
  throw redirect({ to: "/login" })
})

// 4. GET SESSION
export const getSession = createServerFn().handler(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: user } = await supabase.from("users").select("*").eq("id", session.user.id).single()
  return { session, user }
})
```

### 4.3 Admin Invite Flow

```ts
// src/server/admin.ts
export const inviteAgent = createServerFn().handler(async ({ data }) => {
  const { email, name, agent_type, agency_id } = data
  const { data: invite } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { name, agent_type, plan: "custom", agency_id }
  })
  await supabaseAdmin.from("users")
    .update({ name, agent_type, plan: "custom", agency_id })
    .eq("id", invite.user.id)
  return { success: true }
})
```

---

## 5. Frontend Architecture (TanStack Start)

### 5.1 Route Structure

```
src/routes/
├── __root.tsx                  // root: auth guard, injects user+plan into context
├── index.tsx                   // redirect → /dashboard or /login
├── login.tsx                   // public
├── signup.tsx                  // public — agent self-signup
├── pricing.tsx                 // public — pricing page
├── dashboard/                  // protected: role=agent
│   ├── __layout.tsx            // sidebar (config-driven), plan badge, upgrade CTA
│   ├── index.tsx               // overview — KPIs (plan-filtered)
│   ├── leads.tsx               // leads table — gated by leads_max
│   ├── pipeline.tsx            // kanban — gated by pipeline_kanban
│   ├── chat.tsx                // AI chat — gated by ai_messages_per_day
│   ├── documents.tsx           // PDF upload — gated by documents_max
│   ├── marketing/              // marketing studio module
│   │   ├── __layout.tsx        // marketing sub-nav
│   │   ├── index.tsx           // create post — gated by marketing_posts_per_month
│   │   ├── calendar.tsx        // content calendar — gated by content_calendar
│   │   └── analytics.tsx       // social analytics — gated by social_analytics
│   ├── reminders.tsx           // reminders — gated by whatsapp_reminders_per_month
│   ├── automation.tsx          // drip sequences — gated by drip_sequences
│   ├── reports.tsx             // reports — partial gating
│   └── settings.tsx            // profile, social connect, plan/billing
└── admin/                      // protected: role=admin
    ├── __layout.tsx
    ├── index.tsx               // all agents overview
    ├── agents.tsx              // manage agent accounts
    ├── billing.tsx             // subscriptions, MRR
    └── config.tsx              // agent type config editor
```

### 5.2 Root Route — Auth + Plan Injection

```tsx
// src/routes/__root.tsx
export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const result = await getSession()
    const publicPaths = ["/login", "/signup", "/pricing"]
    if (!result && !publicPaths.includes(location.pathname)) {
      throw redirect({ to: "/login" })
    }
    if (result?.user.role === "admin" && !location.pathname.startsWith("/admin")) {
      throw redirect({ to: "/admin" })
    }
    return {
      user: result?.user ?? null,
      plan: (result?.user?.plan ?? "free") as PlanKey,
      limits: getPlanLimits(result?.user?.plan ?? "free"),
    }
  },
  component: () => <Outlet />,
})
```

### 5.3 Dashboard Layout — Plan-Aware Sidebar

```tsx
// src/routes/dashboard/__layout.tsx
export function DashboardLayout() {
  const { user, plan, limits } = useRouteContext({ from: "__root__" })
  const config = AGENT_TYPES[user.agent_type]

  return (
    <div className="flex h-screen">
      <aside className="w-56 flex flex-col border-r">
        <AgentProfile user={user} />
        <PlanBadge plan={plan} />
        <nav>
          {config.sidebar_links.map(link => (
            <SidebarLink
              key={link}
              to={link.path}
              locked={!canUseFeature(plan, link.feature_gate)}
            />
          ))}
        </nav>
        <UpgradeCTA plan={plan} />
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

---

## 6. Tier Gating on the Frontend

**Rule:** Never rely only on frontend gating. Every limit must also be checked in the server function. Frontend gating is UX. Server function gating is security. Both must exist.

### 6.1 `usePlan` Hook

```ts
// src/hooks/usePlan.ts
export function usePlan() {
  const { user, plan, limits } = useRouteContext({ from: "__root__" })

  function isAtLimit(feature: keyof typeof limits, currentCount: number): boolean {
    const limit = limits[feature]
    if (limit === "unlimited") return false
    return currentCount >= (limit as number)
  }

  function canUse(feature: keyof typeof limits): boolean {
    return canUseFeature(plan, feature)
  }

  function upgradeReason(feature: string): string {
    const neededPlan = /* ... */
    return `${feature} is available on ${neededPlan} plan. Upgrade to unlock.`
  }

  return { plan, limits, isAtLimit, canUse, upgradeReason, user }
}
```

### 6.2 `FeatureGate` Component

```tsx
// src/components/FeatureGate.tsx
export function FeatureGate({ feature, children, fallback, showLocked = true }: FeatureGateProps) {
  const { canUse, upgradeReason } = usePlan()
  const { openUpgradeModal } = useUpgradeModal()

  if (canUse(feature)) return <>{children}</>
  if (!showLocked) return null

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        {fallback ?? children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button onClick={() => openUpgradeModal(upgradeReason(feature))}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          🔒 Upgrade to unlock
        </button>
      </div>
    </div>
  )
}
```

### 6.3 `UsageLimitBanner` Component

```tsx
// src/components/UsageLimitBanner.tsx
export function UsageLimitBanner({ feature, used, limit }: {
  feature: string; used: number; limit: number | "unlimited"
}) {
  if (limit === "unlimited") return null
  const pct = (used / (limit as number)) * 100
  if (pct < 80) return null // only show at 80%+ usage

  const isAtLimit = used >= (limit as number)
  return (
    <div className={`rounded-lg p-3 text-sm ${isAtLimit ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
      {isAtLimit
        ? `You've reached your ${feature} limit (${limit}/month). Upgrade to continue.`
        : `${used}/${limit} ${feature} used this month. ${(limit as number) - used} remaining.`
      }
      <button className="ml-2 underline font-medium">Upgrade plan →</button>
    </div>
  )
}
```

### 6.4 Gating Map

| Feature / page | Free | Lite | Pro | Custom | Gate type |
|---|---|---|---|---|---|
| AI chat (messages) | Limit banner at 10 | Limit banner at 30 | No limit | No limit | count check + banner |
| Leads table | Locked at 10 | Locked at 100 | No limit | No limit | FeatureGate + count check |
| Pipeline kanban | FeatureGate locked | Visible | Visible | Visible | FeatureGate bool |
| Documents upload | Locked at 1 | Locked at 5 | Locked at 50 | No limit | count check + banner |
| Marketing posts | Locked at 3/mo | Locked at 10/mo | Locked at 30/mo | No limit | monthly count check |
| AI image gen | Locked at 3/mo | Locked at 10/mo | Locked at 30/mo | No limit | monthly count check |
| AI video gen | FeatureGate locked | FeatureGate locked | Locked at 5/mo | No limit | FeatureGate bool + count |
| Social auto-post btn | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| Content calendar | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| WhatsApp broadcast | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| Drip sequences | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| Commission forecast | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| CSV export | FeatureGate locked | FeatureGate locked | Visible | Visible | FeatureGate bool |
| Admin dashboard | Hidden from nav | Hidden from nav | Hidden from nav | Visible | role + plan check |
| White-label settings | Hidden | Hidden | Hidden | Visible | plan check |

### 6.5 Upgrade Modal

```tsx
// src/components/UpgradeModal.tsx
export function UpgradeModal({ isOpen, reason, currentPlan }: {
  isOpen: boolean; reason: string; currentPlan: PlanKey
}) {
  const plans = currentPlan === "free" ? ["lite","pro"] :
                currentPlan === "lite" ? ["pro","custom"] : ["custom"]

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <h2>Unlock this feature</h2>
        <p className="text-muted">{reason}</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {plans.map(p => <PlanCard key={p} plan={p} highlighted={p === "pro"} />)}
        </div>
        <p className="text-xs text-center mt-3">Annual billing saves up to 25%. Cancel anytime.</p>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 7. Server Functions & API Layer

### 7.1 Plan Enforcement in Server Functions

Every server function that touches a plan-limited resource must check the limit server-side.

```ts
// src/server/limits.ts — reusable limit checker
export async function checkLimit(
  userId: string,
  feature: keyof PlanLimits,
  currentCount?: number
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: user } = await supabase.from("users").select("plan").eq("id", userId).single()
  const limits = getPlanLimits(user.plan as PlanKey)
  const limit = limits[feature]

  if (typeof limit === "boolean") {
    return limit ? { allowed: true } : { allowed: false, reason: `${feature} not available on ${user.plan} plan` }
  }
  if (limit === "unlimited") return { allowed: true }
  if (currentCount !== undefined && currentCount >= (limit as number)) {
    return { allowed: false, reason: `${feature} limit reached (${limit}). Upgrade your plan.` }
  }
  return { allowed: true }
}
```

### 7.2 AI Chat with Daily Limit

```ts
// src/server/chat.ts
export const sendChatMessage = createServerFn().handler(async ({ data, context }) => {
  const { message, agentType, sessionId } = data
  const userId = context.user.id

  const usage = await supabase.rpc("get_usage", { p_user_id: userId })
  const check = await checkLimit(userId, "ai_messages_per_day", usage.data.ai_messages_today)
  if (!check.allowed) throw new Error(check.reason)

  await supabase.from("usage")
    .update({ ai_messages_today: usage.data.ai_messages_today + 1,
              ai_messages_count: usage.data.ai_messages_count + 1 })
    .eq("user_id", userId).eq("month", new Date().toISOString().slice(0,7) + "-01")

  const agent = buildAgent(agentType)
  return agent.stream({ messages: [{ role: "user", content: message }] })
})
```

---

## 8. AI Agent Layer (Mastra)

### 8.1 Agent Builder — Config-Driven per Agent Type

```ts
// src/agent/index.ts
import { Agent, Mastra } from "@mastra/core"
import { Memory } from "@mastra/memory"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com/v1",
})
const claude = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const memory = new Memory({
  storage: redis,
  options: { lastMessages: 20, semanticRecall: false }
})

export function buildAgent(agentType: string, plan: PlanKey) {
  const config = getAgentConfig(agentType)
  const limits = getPlanLimits(plan)

  const tools: Record<string, any> = {
    ragSearchTool, crmLookupTool, calculatorTool
  }
  if (limits.marketing_posts_per_month !== 0) {
    Object.assign(tools, { promptEnhancerTool, writeCaptionTool })
  }
  if (limits.ai_images_per_month !== 0) {
    tools.generateImageTool = generateImageTool
  }
  if (limits.ai_videos_per_month !== 0) {
    tools.generateVideoTool = generateVideoTool
  }
  if (limits.social_auto_post) {
    tools.schedulePostTool = schedulePostTool
  }

  return new Agent({
    name: config.label,
    instructions: config.system_prompt,
    model: deepseek("deepseek-chat"),
    tools,
    memory,
  })
}
```

### 8.2 All Mastra Tools

- **ragSearchTool** — pgvector similarity search scoped by agent_id
- **crmLookupTool** — fetches leads/deals/reminders from Supabase
- **calculatorTool** — evaluates math expressions
- **promptEnhancerTool** — rewrites rough prompt to detailed gen prompt
- **generateImageTool** — GPT Image-1 → upload to Supabase Storage
- **generateVideoTool** — Kling 3.0 (async, polls until done) → upload to Supabase Storage
- **writeCaptionTool** — DeepSeek writes platform-optimised caption with hashtags
- **schedulePostTool** — writes to marketing_posts table with status=scheduled

---

## 9. Marketing Studio Module

### 9.1 Page Flow

State machine: `idle → filling_form → enhancing → generating → previewing → scheduling → done`

```tsx
// src/routes/dashboard/marketing/index.tsx
export function MarketingStudioPage() {
  const { plan, isAtLimit } = usePlan()
  const { data: usage } = useUsage()
  const [step, setStep] = useState<"form"|"preview"|"schedule">("form")

  const postsThisMonth = usage?.marketing_posts_count ?? 0
  const atPostLimit = isAtLimit("marketing_posts_per_month", postsThisMonth)

  return (
    <div>
      <UsageLimitBanner feature="marketing posts" used={postsThisMonth}
        limit={limits.marketing_posts_per_month} />
      {atPostLimit ? <UpgradeCTA /> : <ContentTypeSelector />}
      {step === "form" && <PromptForm />}
      {step === "preview" && <ContentPreview />}
      {step === "schedule" && (
        <FeatureGate feature="social_auto_post" fallback={<ManualDownloadOption />}>
          <ScheduleAndPublish platforms={["facebook","instagram","tiktok"]} />
        </FeatureGate>
      )}
    </div>
  )
}
```

### 9.2 Social Publish Edge Function

Runs every 15 minutes via Supabase cron:

1. Fetch scheduled posts due now
2. For each platform in post.platforms:
   - Meta Graph API two-step publish (container → media_publish)
   - TikTok Content API (video only)
3. Log post results
4. Update marketing_posts status to 'published'

---

## 10. Background Jobs & Automation

| Job name | Trigger | What it does | Plan required |
|---|---|---|---|
| publish-scheduled-posts | Every 15 min | Publishes due marketing posts to social platforms | pro/custom (social_auto_post) |
| send-reminders | Every 60 min | Sends due WhatsApp reminders | lite (manual), pro (auto drips) |
| pull-post-metrics | Every 24 hrs | Pulls likes/reach/comments from Meta + TikTok APIs | pro/custom (social_analytics) |
| reset-daily-usage | Every midnight | Resets ai_messages_today counter per user | all plans |
| reset-monthly-usage | 1st of month | Resets all monthly counters | all plans |
| refresh-social-tokens | Every 7 days | Refreshes expiring Meta/TikTok OAuth tokens | pro/custom |
| expire-free-trials | Every midnight | Downgrades trial accounts that have expired to free | system |

---

## 11. System Architecture

### 11.1 Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                           │
│  TanStack Start React 19 + TanStack Router/Query/Table      │
│  shadcn/ui + Tailwind                                       │
│  Plan-gated UI: FeatureGate + UsageLimitBanner              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + SSE (streaming)
┌──────────────────────▼──────────────────────────────────────┐
│  SERVER (Railway — Node.js)                                 │
│  TanStack Start server functions                            │
│  Plan limit checker (checkLimit)                            │
│  Mastra AI agent (per request, per agent_type + plan)       │
│    ├── DeepSeek V3 (primary LLM)                           │
│    ├── Claude Haiku (fallback LLM)                          │
│    ├── GPT Image-1 (image generation — Pro+)                │
│    ├── Kling 3.0 (video generation — Pro+)                  │
│    └── Tools: RAG, CRM, Calculator, Caption, Schedule       │
│  Twilio webhook handler (WhatsApp inbound)                  │
└──────────┬───────────────────────────┬─────────────────────┘
           │                           │
┌──────────▼──────────┐   ┌────────────▼─────────────────────┐
│  Upstash Redis       │   │  Supabase (Singapore)            │
│  Agent memory        │   │  ├── PostgreSQL + RLS            │
│  Session state       │   │  ├── pgvector (embeddings/RAG)   │
│  Rate limit counters │   │  ├── Storage (PDFs, media)       │
└─────────────────────┘   │  ├── Auth (JWT + sessions)        │
                          │  └── Edge Functions (cron jobs)   │
┌─────────────────────┐   └──────────────────────────────────┘
│  External APIs       │
│  Twilio WhatsApp     │
│  Meta Graph API      │
│  TikTok Content API  │
│  Resend (email)      │
└─────────────────────┘
```

### 11.2 Request Lifecycle — AI Chat

1. Agent types message in chat UI
2. TanStack Query mutation → server function: `sendChatMessage()`
3. Server: get session cookie → validate JWT → fetch user+plan
4. Server: `checkLimit("ai_messages_per_day", todayCount)`
5. Server: if at limit → throw error → UI shows upgrade modal
6. Server: increment usage counter in Supabase
7. Server: `buildAgent(agentType, plan)` → Mastra agent with plan-appropriate tools
8. Mastra: load last 20 messages from Redis (session memory)
9. Mastra: classify intent → choose tools
10. Mastra: assemble prompt = system_prompt + retrieved_context + history + user_message
11. Mastra: call DeepSeek V3 API → stream tokens
12. Server: stream SSE back to client
13. UI: TanStack Query handles streaming → renders token by token
14. Server: save full conversation to Supabase conversations table
15. Server: update Redis session memory

### 11.3 Request Lifecycle — Marketing Post Creation

1. Agent fills prompt form in Marketing Studio
2. Server: `checkLimit("marketing_posts_per_month", monthCount)`
3. Server: `checkLimit("ai_images_per_month", imageCount)` [if image post]
4. Server: `checkLimit("ai_videos_per_month", videoCount)` [if video post]
5. Mastra: `promptEnhancerTool` → DeepSeek rewrites rough prompt
6. Mastra: `generateImageTool` → GPT Image-1 API → image URL
   OR `generateVideoTool` → Kling 3.0 API (async, polls until done) → video URL
7. Upload media to Supabase Storage → get signed public URL
8. Mastra: `writeCaptionTool` → DeepSeek writes caption + hashtags per platform
9. UI: show preview to agent — approve or regenerate
10. If `social_auto_post = true` (Pro+): `schedulePostTool` → insert into marketing_posts
11. If `social_auto_post = false` (Free/Lite): offer download only
12. Edge Function cron (every 15 min) picks up scheduled posts → publishes via Meta/TikTok API
13. Post results logged → metrics pulled daily → visible in Reports tab

---

## 12. Environment Variables

| Variable | Source | Used by | Required for |
|---|---|---|---|
| SUPABASE_URL | Supabase → Settings → API | All DB calls | All tiers |
| SUPABASE_ANON_KEY | Supabase → Settings → API | Browser client (safe) | All tiers |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API | Server admin ops | Admin + server only |
| DEEPSEEK_API_KEY | platform.deepseek.com | Mastra primary LLM + captions | All tiers |
| ANTHROPIC_API_KEY | console.anthropic.com | Claude Haiku fallback LLM | All tiers |
| OPENAI_API_KEY | platform.openai.com | GPT Image-1 + embeddings | Lite+ (images) + RAG |
| KLING_API_KEY | klingai.com → API | Kling 3.0 video generation | Pro+ (video gen) |
| UPSTASH_REDIS_REST_URL | console.upstash.com | Mastra memory + session state | All tiers |
| UPSTASH_REDIS_REST_TOKEN | console.upstash.com | Mastra memory + session state | All tiers |
| TWILIO_ACCOUNT_SID | console.twilio.com | WhatsApp webhook handler | Lite+ (reminders) |
| TWILIO_AUTH_TOKEN | console.twilio.com | WhatsApp webhook handler | Lite+ (reminders) |
| TWILIO_WHATSAPP_NUMBER | console.twilio.com | Outbound WhatsApp messages | Lite+ (reminders) |
| META_APP_ID | developers.facebook.com | Facebook + Instagram OAuth | Pro+ (social post) |
| META_APP_SECRET | developers.facebook.com | Facebook + Instagram OAuth | Pro+ (social post) |
| TIKTOK_CLIENT_KEY | developers.tiktok.com | TikTok OAuth + Content API | Pro+ (TikTok post) |
| TIKTOK_CLIENT_SECRET | developers.tiktok.com | TikTok OAuth + Content API | Pro+ (TikTok post) |
| RESEND_API_KEY | resend.com → API Keys | Transactional email | All tiers |

---

## 13. Railway Deployment

| Setting | Value |
|---|---|
| Service name | agentflow |
| Build command | `npm run build` |
| Start command | `node .output/server/index.mjs` |
| Node version | 20+ |
| Env vars | All from Section 12 in Railway Variables tab |
| Domain | Railway auto → custom domain |
| Supabase | External — SUPABASE_URL env var |
| Redis | Upstash — UPSTASH_REDIS_REST_URL |
| Auto-deploy | Connect GitHub → Railway deploys on push to main |
| Health check | GET /health → 200 |
| Logs | Railway dashboard → Logs tab + Sentry |
| Scaling | Railway auto-scales Node server |

No ChromaDB service. No Python service. No separate Redis service on Railway. pgvector is in Supabase. Redis is Upstash serverless. Everything external except the one Node.js app on Railway.

---

## 14. Decision Log

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| Full-stack framework | TanStack Start | Next.js | TypeScript-first, no framework lock-in, same TanStack ecosystem |
| AI agent framework | Mastra | LangGraph (Python) | TypeScript-native, replaces Python service entirely |
| Auth | Supabase Auth | Clerk / NextAuth | Ties directly to RLS, invite flow built in, free |
| Vector store | pgvector (Supabase) | ChromaDB | Same DB, no separate service, RLS applies automatically |
| Chat LLM | DeepSeek V3 | Claude Sonnet | 50-60x cheaper, sufficient for chat/CRM/drafting |
| LLM fallback | Claude Haiku | GPT-4o mini | Better instruction following for brand-sensitive content |
| Image gen | GPT Image-1 | Midjourney | Has API, commercial rights, best quality 2026 |
| Video gen | Kling 3.0 | Runway Gen-4.5 | $0.10/sec, 3-min clips, audio included, API-first |
| Social publish | Meta Graph API (direct) | Buffer/Hootsuite | Free API, no middleman, supports all Meta content types |
| Background jobs | Supabase Edge Functions | BullMQ / cron server | Serverless, co-located with DB, free tier |
| Tier gating | Both FE + server check | FE only or server only | FE is UX; server is enforcement |
| Deployment | Railway | Vercel | Vercel 10s limit breaks Mastra streaming + video gen polling |
