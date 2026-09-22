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
- [x] Apply migration `0029_studio_image_quota_and_planned_posts.sql` to the
  target Supabase project (confirmed by the user on 2026-09-22).
- [ ] Add a provider balance alert for Z.AI code 1113 once an operations
  notification destination is chosen. Image generation still requires funded
  Z.AI credit.

## Step 2 — usable content workspace

- [x] Add draft editing, duplication, and a list/calendar view with filters for
  platform, planned date, and status.
- [x] Let users upload and attach existing images and select from the Studio
  library. Keep AI output editable before saving.
- [x] Organize assets into folders and support up to 10 ordered images per post
  for manual carousel preparation. The first image is the cover.
- [x] Apply migration `0031_studio_asset_folders_and_post_images.sql` to the
  target Supabase project (confirmed by the user on 2026-09-22).
- [x] Add a brand kit (voice, audience, colors, logo, default hashtags, and
  disclaimer) and reusable post templates. The Create form can start from a
  starter or saved template, and post generation uses the saved brand voice.
- [x] Apply migration `0030_studio_brand_kit_and_templates.sql` to the target
  Supabase project (confirmed by the user on 2026-09-22).
- [x] Separate one content idea from channel-specific versions. Existing posts
  become single-version ideas; the Planner groups versions, edits the shared
  brief, and generates an editable draft for another channel.
- [x] Make Create a focused action page instead of a Studio tab. Planner opens
  a blank composer; an approved source card opens it with that source selected.
  `/studio` redirects to Planner for existing bookmarks.
- [x] Apply migration `0032_studio_content_ideas.sql` after 0031 (confirmed by
  the user on 2026-09-22).

## Next without connected publishing

- [x] Add a manual posting pack for each channel version: copy-ready caption
  and hashtags, ordered image downloads, and the planned date in one place.
- [x] Ground generated drafts in owner-approved source cards for listings, CRM,
  and knowledge facts. The user selects up to five cards; Create and Planner
  show the exact facts before saving, and posts retain a source snapshot.
  Raw CRM contacts and knowledge documents are not sent to the generator.
- [x] Apply migration `0033_studio_approved_sources.sql` to the target Supabase
  project (confirmed by the user on 2026-09-22).
- [x] Let owners start a source card from a ready knowledge document excerpt or
  a client company profile. The imported facts remain unapproved until reviewed.
- [ ] Choose an operations notification destination and alert on Z.AI balance
  exhaustion (`1113`).

## Step 3 — actual publishing (deferred by user on 2026-09-22)

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

- [ ] Link approved source cards to their original knowledge documents, CRM
  records, or listing system when a listing model exists. Keep explicit review
  before publishing.
- [ ] Add trackable links and connect campaign activity to CRM leads and
  conversions. Add approvals and analytics after reliable publishing exists.

## Verification gates

1. `npx tsc --noEmit` and `npm run build` pass.
2. Quota: concurrent requests never exceed a monthly cap; both image entry
   points consume the same count, and denied requests never call Z.AI.
3. Storage: a failed mirror yields a failed asset and no post-attachable URL.
4. Planning: a future date is shown as Planned, never as published or queued
   for automatic delivery.

Migrations 0029–0033 are applied according to the user's confirmations.
Connected publishing and video remain deferred; planned dates still require
manual posting.
