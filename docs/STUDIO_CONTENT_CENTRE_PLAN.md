# Studio content centre implementation plan

Started 2026-09-21 on `codex/studio-content-centre`.

## Product rule

Studio is a place to create and manage posts and images. A chosen date is a
manual content plan until a connected social account and a delivery worker
actually publish the post. Video remains Coming Soon; the Custom tier video
entitlement stays configured.

## Step 1 — trustworthy foundation (in this branch)

- [x] Label future dates as **Planned** and explain manual publishing in the
  composer. New posts stay `ready`; previously misleading `scheduled` rows
  migrate to `ready` while retaining `scheduled_for`.
- [x] Reject attempts to set delivery states through the general post update
  RPC. Validate planned dates on the server.
- [x] Require generated images to reach Supabase Storage before their asset
  becomes `ready`; attach only durable, owned assets to posts.
- [x] Add an atomic monthly image attempt quota shared by the form and Studio
  agent: Pro 100, Custom 500, Free/Lite 0. Admin/owner accounts bypass the
  image quota for support and demos; the plan feature gate still applies.
- [x] Show remaining images in the form and describe the quota on pricing.
- [ ] Apply migration `0029_studio_image_quota_and_planned_posts.sql` to the
  target Supabase project before deploying this branch.
- [ ] Add a provider balance alert for Z.AI code 1113 once an operations
  notification destination is chosen. Image generation still requires funded
  Z.AI credit.

## Step 2 — usable content workspace

- [x] Add draft editing, duplication, and a list/calendar view with filters for
  platform, planned date, and status.
- [x] Let users upload and attach existing images and select from the Studio
  library. Keep AI output editable before saving.
- [ ] Organize assets and support several assets per post for carousels.
- [ ] Add a brand kit (voice, colors, logo, default hashtags) and reusable
  post templates.
- [ ] Separate one content idea from channel-specific versions so Instagram,
  Facebook, LinkedIn, and other destinations can have tailored captions.

## Step 3 — actual publishing

- [ ] Choose and integrate a publishing path: a supported provider such as
  Buffer for a pilot, or direct platform APIs starting with Meta. Complete
  OAuth/account connection, token refresh, permission checks, and disconnect.
- [ ] Add a durable delivery queue with retry rules and real states:
  `scheduled`, `publishing`, `published`, `failed`. Store the platform post URL,
  external ID, and delivery error. Only call a post published after platform
  confirmation.
- [ ] Display connected destinations and per-channel publish previews. Keep
  WhatsApp, Telegram, and email as separate distribution workflows.

## Step 4 — lead-generating workflows

- [ ] Ground drafts in approved knowledge-base content, listings, and CRM
  context, with source review before publishing.
- [ ] Add trackable links and connect campaign activity to CRM leads and
  conversions. Add approvals and analytics after reliable publishing exists.

## Verification gates

1. `npx tsc --noEmit` and `npm run build` pass.
2. Quota: concurrent requests never exceed a monthly cap; both image entry
   points consume the same count, and denied requests never call Z.AI.
3. Storage: a failed mirror yields a failed asset and no post-attachable URL.
4. Planning: a future date is shown as Planned, never as published or queued
   for automatic delivery.

Deployment of Step 1 requires the SQL migration before application code; until
then, image generation will fail closed when it asks for the monthly quota RPC.
