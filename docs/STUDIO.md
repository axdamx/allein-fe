# Marketing Studio — Implementation Status

> Last updated: 2026-09-21
> Status: **Content and image workflows open; video generation coming soon**

The Studio is a creative workspace for AI content generation. The current
navigation exposes content creation, image chat, and the asset library.
This doc tracks what's built, what's wired, what's known-broken, and what's
deferred.

---

## Tabs at a glance

| Route | Tab | Purpose |
|---|---|---|
| `/studio` | Create | Form-driven content generation, image attachment, and video coming soon card |
| `/studio/chat` | Image chat | Conversational image generation with the Studio Agent |
| `/studio/storyboard` | Storyboard | Brief → scene-by-scene video planning (not linked in current navigation) |
| `/studio/library` | Library | Grid of all generated assets with download/delete |

Layout + tab nav: `src/routes/_authed.studio.tsx` (mirrors the CRM layout
pattern with `<Outlet />`). The active navigation exposes Create, Image chat,
and Library. Video is labelled Coming soon. The Custom plan's video feature
flag remains configured, while the public video submit endpoint refuses new
jobs and the Studio Agent has no video tool until monthly metering is ready.

---

## Architecture

```
[Browser]
   │  TanStack Start RPC (createServerFn)
   ▼
[src/server/*.ts]              ← public boundary, enforces feature flags
   │
[src/server/*.server.ts]       ← impl, talks to Supabase + providers
   │
   ├──► [src/lib/media/*]      ← ZAI CogView/CogVideoX HTTP client
   │       └──► ZAI API (single LLM_API_KEY)
   │
   ├──► [src/mastra/agents/studio-agent.ts]  ← Studio Agent
   │       └── tools: generate_image, generate_video, analyze_image
   │
   └──► Supabase (Postgres + Storage)
           tables: studio_assets, studio_chats, studio_messages,
                   studio_storyboards, studio_scenes
           bucket: media (public-read, per-user write)
```

**Single media provider**: ZAI for both LLM (glm-4.5-flash) and media
(CogView-4 for images, CogVideoX-3 for video). Reuses `LLM_BASE_URL` +
`LLM_API_KEY` — one credential, one bill. Swappable behind
`src/lib/media/*` (see "Provider swap" below).

---

## What's built and verified

### Media backend (Phase 1) ✅
- `src/lib/media/zai-client.ts` — hardened HTTP client with proper error
  extraction (handles ZAI's nested `{ error: { code, message } }` shape)
- `src/lib/media/cogview.ts` — text→image, aspect-ratio → valid pixel size map
- `src/lib/media/cogvideox.ts` — async submit + poll wrapper
- Valid model names: `cogview-4-250304` (image), `cogvideox-3` (video)
- Valid request shapes: `size` (not aspect_ratio), `image_url` as array,
  `quality: 'speed' | 'quality'`
- Every asset is mirrored from ZAI's ephemeral URL → `media` Storage bucket
- `src/server/media.{ts,server.ts}` — `generateImage`, `submitVideo`,
  `pollVideo`, `listAssets`, `getAsset`, `deleteAsset`
- `src/hooks/use-media.ts` — TanStack Query hooks

### Conversational studio (Phase 2) ✅
- `src/mastra/agents/studio-agent.ts` — creative-director persona
- `src/mastra/tools/studio-tools.ts` — `generate_image`, `generate_video`,
  `analyze_image`. Tools read `resourceId` as owner id, enforce plan flags.
- `src/server/studio-chat.{ts,server.ts}` — full chat CRUD + send + attachment
  upload. Reuses daily `messages` quota.
- `src/hooks/use-studio-chat.ts` — chats, messages, send (progressive reveal),
  upload
- `src/routes/_authed.studio.chat.tsx` — 3-pane: chat list · thread · canvas
- `src/components/studio/{studio-message-bubble,studio-chat-input}.tsx`
- Image attachments: base64 → server fn → Storage → URL passed to agent as
  multimodal content (vision)

### Storyboard (Phase 3) ✅
- `src/server/storyboard.{ts,server.ts}` — CRUD + `generateStoryboardFromBrief`
  (LLM decomposes brief into N scenes)
- `src/hooks/use-storyboard.ts` — list/get/upsert/delete/reorder + compound
  generate-from-brief mutation
- `src/components/studio/storyboard-scenes.tsx` — @dnd-kit sortable strip
  (pointer + keyboard sensors)
- `src/routes/_authed.studio.storyboard.tsx` — list + brief form + editor

### Library ✅
- `src/routes/_authed.studio.library.tsx` — filterable grid, status badges,
  failed-row error surfacing + delete

### Polish (Phase 4) ✅
- Sample prompt starters in chat empty state (one-click → new chat + send)
- Quota pill + locked-state UX in studio composer (parity with CRM ChatInput)
- framer-motion stagger on messages
- JSON extraction hardened (`src/lib/json-extract.ts`) — used by storyboard +
  marketing generators

---

## Database

Three migrations, applied in order:
- `0019_studio_assets.sql` — `studio_assets` table + `media` Storage bucket
- `0020_studio_chats.sql` — `studio_chats` + `studio_messages`
- `0021_studio_storyboards.sql` — `studio_storyboards` + `studio_scenes` +
  `reorder_studio_scenes` RPC

All tables have RLS scoped to `owner_id = auth.uid()`. Messages/scenes access
via join-through-ownership policies.

---

## Plan gating (current state)

Enforced in two places, both server-side:
1. **`src/server/media.ts`** — `enforceFeature('aiImageGen' | 'aiVideoGen')`
   on the public RPC boundary
2. **`src/mastra/tools/studio-tools.ts`** — `ownerHasFeature()` inside each
   tool (defense in depth for the agent path)

Current tier access (from `src/lib/plans.ts`):
- Free / Lite: no image, no video
- Pro: image ✅, no video
- Custom: image ✅, video ✅

**⚠️ KNOWN GAP — no metering.** See `docs/STUDIO_BILLING_ROADMAP.md`.

**Key insight from billing analysis (2026-07-08):** metering must split into
two layers — a *cheap layer* (chat, image gen at ~$0.01) that's metered
generously so iteration feels free, and an *expensive layer* (Kling video
at ~$0.70/clip) that's metered strictly with upfront UX warnings. Naive
per-attempt metering on video would let a single iterating user burn $1.40+
of your balance producing nothing they kept. Full analysis + revised quota
table in the billing roadmap.

---

## Provider swap (when you decide to switch)

The media layer is abstracted so swapping providers is localized:

**Swap image provider (e.g. ZAI → fal.ai Flux):**
1. Add `src/lib/media/fal-client.ts` mirroring the `generateImage` signature
2. Update `src/lib/media/cogview.ts` (or create `flux.ts`) to call the new
   client
3. Update model name in `src/lib/media/cogview.ts` default
4. No changes to: hooks, server fns, UI, agent tools

**Swap video provider (e.g. ZAI → Kling via fal.ai):**
1. Add `src/lib/media/kling-client.ts` with `submitVideoJob` + `getVideoJobStatus`
2. Update `src/lib/media/cogvideox.ts` to delegate
3. Update async-poll shape if Kling differs (it returns webhook-style; the
   polling wrapper normalizes)
4. Update model name default
5. No UI/hook changes

**Recommended split** (per pricing analysis, 2026-07-06):
- Keep ZAI for images ($0.01/image — cheapest)
- Move video to Kling via fal.ai (better quality, worth the premium for a
  creative product)
- See `docs/STUDIO_BILLING_ROADMAP.md` for full cost math

---

## Known issues / gotchas

| Issue | Status | Notes |
|---|---|---|
| ZAI image/video balance empty | **User action** | Recharge at bigmodel.cn or z.ai/billing. Code returns `code: 1113` cleanly. |
| `analyze_image` may fail if GLM-4.5-flash lacks vision | Acceptable | Tool degrades gracefully with a clear error. Set `LLM_DEFAULT_MODEL=glm-4.5v` if vision matters. |
| No video in storyboard scenes | By design | Per-scene video is slow/expensive. Scene prompts are ready to feed to video gen later. |
| Storyboard library tab has no "save as post" | Future | Export to PNG contact sheet or multi-asset post is a Phase 5 item. |
| Library failed-row cleanup is manual | Acceptable | Delete button works; could add bulk-clear later. |

---

## File map

```
src/lib/media/
  zai-client.ts          # HTTP client + error extraction
  cogview.ts             # image gen wrapper
  cogvideox.ts           # video gen wrapper (async submit + poll)

src/server/
  media.ts               # public RPC (feature-gated)
  media.server.ts        # impl (mirror to Storage, track in studio_assets)
  studio-chat.ts         # public RPC for chat
  studio-chat.server.ts  # impl (agent.generate + multimodal + quota)
  storyboard.ts          # public RPC
  storyboard.server.ts   # impl (CRUD + brief→scenes LLM call)

src/mastra/
  agents/studio-agent.ts # creative-director agent (no semanticRecall)
  tools/studio-tools.ts  # generate_image, generate_video, analyze_image
  index.ts               # registers studio agent + getStudioAgent()

src/hooks/
  use-media.ts           # image (one-shot) + video (submit+poll) hooks
  use-studio-chat.ts     # chat CRUD + send + upload
  use-storyboard.ts      # storyboard CRUD + generate-from-brief

src/components/studio/
  media-generator.tsx            # form-based image/video card
  studio-message-bubble.tsx      # attachment + media rendering
  studio-chat-input.tsx          # composer w/ image upload + quota pill
  storyboard-scenes.tsx          # @dnd-kit sortable scene strip

src/routes/
  _authed.studio.tsx              # layout + tab nav
  _authed.studio.index.tsx        # Create tab (original generator)
  _authed.studio.chat.tsx         # Chat tab
  _authed.studio.storyboard.tsx   # Storyboard tab
  _authed.studio.library.tsx      # Library tab
```

---

## What's deferred

See `docs/STUDIO_BILLING_ROADMAP.md` for the metering + admin bypass plan.
Other deferred items:
- Video generation in storyboard scenes
- Save storyboard as multi-asset post / PNG contact sheet export
- Bulk failed-asset cleanup in Library
- Per-user media usage dashboard surface
