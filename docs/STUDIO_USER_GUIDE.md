# Marketing Studio: user guide and hands-on test plan

Last checked against `codex/studio-content-centre` on 2026-09-22.

## What Studio is for

Studio takes a marketing idea from verified facts to an editable channel draft,
an image set, a planned date, and a pack you can use to post manually. A typical
path is **Brand kit → Sources → Create → Library → Planner → Posting pack**.

Studio prepares posts; it does not currently connect to Instagram, Facebook,
LinkedIn, or other channels or publish on your behalf. A **Planned** date is a
reminder in the content calendar, not an automatic publishing job. Video shows
**Coming soon** and cannot be generated, including on the Custom tier.

| Section | What you do there | Why it matters |
| --- | --- | --- |
| Create action (`/studio/create`) | Generate and edit the first post for an idea; attach images; save a draft or planned post | Turns one brief into reviewable content; open it from Sources or Planner |
| Planner (`/studio/planner`) | Edit ideas and posts, add channel versions, filter, view the calendar, open posting packs | Keeps one campaign idea and its channel copy together |
| Image chat (`/studio/chat`) | Discuss an image, attach an image for analysis, or ask the Studio agent to generate one | An alternative, conversational image workflow |
| Library (`/studio/library`) | Upload, find, download, organize, and delete images | Keeps reusable assets in one place |
| Brand kit (`/studio/brand`) | Set voice, audience, hashtags, colors, logo, disclaimer, and templates | Gives new drafts a consistent direction |
| Sources (`/studio/sources`) | Curate and approve public facts from listings, knowledge documents, or client company profiles | Grounds specific claims in material you have reviewed |

## Do you need to top up Z.AI first?

**Only for the paid image-generation test, if the Z.AI API account has no
available credit or applicable image package.** The app uses the same server
`LLM_API_KEY` for GLM text and GLM-Image images; there is no separate “media
token” configured in this project. Z.AI currently lists **GLM-4.5-Flash as
free** and **GLM-Image at US$0.015 per image**. The separate
[GLM-Image website](https://image.z.ai/) is labelled free; its web access does
not make API calls from Studio free. Check the account connected to that API
key for its current balance or package before testing paid images.
Z.AI defines API error **1113** as insufficient balance or no resource package.
These prices and terms were checked on 2026-09-22; use Z.AI's current pages when
you actually add credit: [official pricing](https://docs.z.ai/guides/overview/pricing),
[GLM-Image API guide](https://docs.z.ai/guides/image/glm-image),
and [official error codes](https://docs.z.ai/api-reference/api-code).

You can test brand settings, source curation, image uploads, the library,
planning, and posting packs without a paid image call. Text post generation uses
GLM-4.5-Flash through the configured API key; it still needs a working Z.AI API
connection even though that model is listed as free. Asking **Image chat** to
create an image calls GLM-Image and needs provider capacity. Uploading an image
you already own does not call GLM-Image.

Your **app plan** and **Z.AI provider balance** are separate controls. In this
app, Free and Lite can use Studio content management but cannot generate AI
images. Pro allows 100 image attempts per month; Custom allows 500. Both the
Create image card and Image chat use the same monthly image counter. Attempts
reserve a credit before the provider call. Successful images count even when
discarded; a failed generation with no ready Library asset returns one app
credit. Pro and Custom access therefore does not replace funding for the Z.AI
API account.
Accounts with an `admin` or `owner` role bypass the app's monthly image count
for support and demos when their plan includes image generation; the paid Z.AI
provider call still occurs.

## Before the first test

1. Sign in to an account with access to Studio. The Studio tab should be in the
   app navigation.
2. Confirm the deployment includes the current Studio branch. The navigation
   should show **Planner, Image chat, Library, Brand kit, Sources** and a
   **Video Coming soon** label. Create is an action button, not a tab.
3. Confirm the Studio database migrations through `0034_studio_image_credit_refunds.sql`
   have been applied. The project owner confirmed migrations 0029–0033 on
   2026-09-22; 0034 is still required before testing image generation. A
   missing 0034 migration makes image generation temporarily unavailable.
   The server also needs `SUPABASE_SERVICE_ROLE_KEY` for credit reservation
   and refund calls.
4. Have one test image ready if you want to test uploads. PNG, JPEG, WebP, and
   GIF files up to 10 MB are accepted.
5. Use test facts you are comfortable putting in a public post. Do not approve
   contact details, private CRM notes, or confidential document text.

## Walkthrough: one complete post, without buying images

### 1. Set up the brand kit

Open **Studio → Brand kit**. Enter a brand name, target audience, and a short
voice description, such as “warm, concise, practical, and never pushy.” Add
default hashtags if useful and save. You can add up to five colors in
`#RRGGBB` format and select or upload a logo from the Studio library.

**Why:** New text drafts use the saved brand guidance; default hashtags are
merged into each channel's permitted set. When you later click **Derive from
caption** in image generation, the brand name and colors help form the image
prompt. The saved logo is a reference; it is **not** automatically placed on
generated images.

Optional: in **Post templates**, select a starter such as **New listing
spotlight**, choose **Customize**, replace the bracketed example details, and
save it as your own template. A template pre-fills the Create prompt, channel,
and tone; it does not publish or generate a post by itself.

### 2. Add and approve source facts

Open **Studio → Sources**. For a quick test, create a **Listing** card manually:

> Title: Demo apartment near KL Sentral
>
> Facts: Demo listing for testing only. Two bedrooms. One parking space.

Use only facts you have verified in a real workflow. Check **I reviewed these
facts and approve them for public post drafts**, then click **Add source**. It
should appear in the Source library with an **Approved** badge.

You can also choose a **ready knowledge document** or a **client company
profile** under **Start from an existing record**, then click **Use**. This
copies an excerpt or company fields into a **new, unapproved** source form.
Trim and verify it before checking approval and saving. Client imports include
company, industry, and website, but do not copy email, phone, or notes. A
client without a company profile cannot be imported this way. The app has no
dedicated listings table yet, so listing facts are entered manually.

**Why:** The AI gets only the approved source cards you explicitly select for
a draft. It does not silently send all CRM records or knowledge documents to
the post generator. If you edit a source card, confirm approval again before
using its revised facts.

### 3. Upload an image for reuse

Open **Studio → Library** and click **Upload image**. Pick your test file. A
successful upload appears as a ready image. Create a folder such as “Demo
campaign,” then choose it from the image's folder selector. Try the **Images**
filter and search by the file name. You can also upload while choosing post
images or a brand logo; those uploads enter the same library.

**Why:** Uploaded images are durable assets in Supabase Storage and can be
reused in several posts. This step does not use Z.AI image generation or the
monthly AI image allowance.

### 4. Generate the first channel draft

From the approved card in **Studio → Sources**, click **Create post**. The
full-page composer opens with that source selected and a starter brief. You
can also click **Create post** from Planner for a post without a preselected
source. Optionally choose a starter or saved template. Replace every
`[bracketed detail]` with real facts, choose **Instagram** and a tone, then
click **Generate content**.

The preview should show the **source facts**, generated title, caption, and
hashtags. Compare any price, date, availability, property feature, or claim in
the caption against your source. Edit the draft directly. You can click
**Copy** to try the text without saving. Selecting no source is allowed, but
you should review all specific claims yourself.

**Why:** The model drafts copy; you remain the fact checker and editor. The
brand kit shapes style, while selected Sources provide the claims that can be
used. If you edit or revoke a selected source between generation and saving,
the save asks you to generate again so you review the current facts.

### 5. Add images and save

In the preview, use **Post images** to choose the uploaded image. You can
select up to **10** images. The first is the **cover**; use the left/right
controls to arrange the rest. Multiple images prepare a carousel for manual
posting. You can leave images empty and make a text-only draft.

Optionally check **Add to content plan** and choose a future date and time.
Click **Save post** or **Save to plan**. The app returns to **Planner**, where
the saved post appears. Saving a post uses the app's daily post allowance;
generating and editing text does not consume a post credit. Create disables
its **Generate content** button when the daily post limit is reached. Current
daily save limits are Free 3, Lite 30, Pro 150, and Custom unlimited.
Duplicating a post also saves a new post and uses that allowance.

**Why:** Saving gives you an editable channel version and makes its images,
selected source snapshot, and planned date available later. The planned date
does not send content to the channel.

### 6. Add another channel version in Planner

Open **Studio → Planner**. In **List**, find the new content idea. Click **Edit
idea** to refine the shared brief if needed. Click **Add channel version**,
choose **LinkedIn**, review the selected approved facts, and click **Generate
version**. Edit the LinkedIn title and caption; change the images if useful;
save the channel draft.

**Why:** One idea can have separate copy for each channel. The Planner allows
one version per channel per idea. The version starts from the shared idea brief
and can reuse the first post's images and selected sources, but you should
review the result for the new audience and channel.

Try the channel and status filters, search, and **Calendar** view. A post with
a future planned date appears on its calendar day. Use **Edit** to adjust the
copy, state (**Draft** or **Ready**), images, or planned date. **Duplicate post**
creates a separate content idea. The **Planned** status means work is intended
for that date, not that publishing is queued.

### 7. Prepare the manual posting pack

On a saved post in Planner, click **Posting pack**. Check the channel and local
planned date. For email, the post title is
available as a subject. Use **Caption**, **Copy post text**, or **Copy hashtags
only** as appropriate. Download each attached image in its displayed order;
image 01 is the cover. Then open the social channel yourself and publish there.

**Why:** The pack collects the final copy and ordered image files in one place
without claiming an external channel has received them.

## Optional paid test: generate one image

After confirming your account is **Pro or Custom** and the Z.AI API account
behind `LLM_API_KEY` has usable image capacity:

1. Open **Create post** from Sources or Planner and generate a draft. In its
   preview, find **Image Generation** under **Enhance with media**. Click
   **Derive from caption** or enter a precise visual prompt.
2. Choose an aspect ratio: square `1:1`, landscape `16:9`, portrait `9:16`, or
   classic `4:3`. Click **Generate Image** once.
3. Expect a preview and a new ready image in **Library**. The first generated
   image is attached to the Create preview automatically. Regenerate once,
   then use the generated-image strip to preview each result and select two
   for a side-by-side comparison. Earlier results remain available. Click
   **Use this image in post** to attach a later result, then reorder the
   selected images before saving.
4. In **Library**, verify the asset can be viewed, downloaded, moved to a
   folder, and found by prompt search. For a regular Pro or Custom user, the
   monthly image count should move by one. **Regenerate** is another paid
   attempt and consumes another app quota unit for regular users.

For the chat path, open **Image chat**, start a chat, and ask it to create an
image. The Studio agent may create the image, show it in the conversation and
canvas, and save it in Library. You can also attach an image and ask for
analysis or a variation. Asking it to **generate** a variation is another
GLM-Image call. Image chat messages are subject to the app's message allowance
as well as the shared image-generation allowance when the image tool runs.

If the provider has no usable balance or image package, Z.AI can return
`1113`. The app shows a temporary-unavailability message and leaves a
**failed** asset in Library with the detailed provider error. Check that asset
before retrying. If no ready image reached Library, the app returns the image
credit once; the response confirms the refund or asks you to contact support
if it cannot be confirmed. Funding the provider account and retrying is a separate action
from changing the app user's subscription.

## What to verify while testing

| Test | Expected result |
| --- | --- |
| Save Brand kit and refresh | Saved voice, audience, hashtags, and other fields remain |
| Save an unapproved Source | It appears in Sources but cannot be selected in Create |
| Approve that Source | It becomes selectable in Create and Planner |
| Import a ready knowledge document | A copied excerpt fills a new unapproved card; review is required |
| Import a client company profile | Company, industry, and website fill a new unapproved card; contact details do not |
| Generate a post from one selected Source | Preview lists that source's exact facts alongside editable copy |
| Save a post with a future date | It appears as Planned in Planner's list and calendar, with manual publishing wording |
| Add a second channel version | Both versions stay under the same idea and have separate editable copy |
| Attach and reorder two uploaded images | The first is the cover; Posting pack lists both in that order |
| Open Posting pack | Caption/hashtags copy and image downloads work; no channel delivery is claimed |
| Generate an image after funding | Ready asset appears in Library; the monthly attempt count changes for a regular user |
| Image request fails | User sees an error; failed asset retains the reason in Library; app credit is returned once if no ready image exists |

## Common questions and limits

- **I do not see Sources or the new Planner:** verify that the current Studio
  branch has been deployed. If the tab opens but data cannot load, check the
  relevant migration, especially `0033` for Sources.
- **A knowledge document is absent from the import picker:** it must finish
  processing and have **ready** status in Knowledge Base. Imports copy an
  excerpt into a source card; they do not stay synchronized with the document.
- **An approved source disappeared from selection:** it may have been edited,
  unapproved, or deleted. Review and approve it again. Saved posts retain a
  snapshot of the source facts used when they were created.
- **An image will not attach:** only ready, permanently stored images owned by
  the account can be attached. Check the Library status and try an upload if
  provider generation is unavailable.
- **An image will not delete:** images used by a saved post or as the brand
  logo are protected. Remove or replace those references first, then delete
  the asset from Library.
- **A planned post did not appear on Instagram/Facebook/etc.:** this is the
  current manual workflow. Open its Posting pack and publish it yourself.
- **Video is visible but unavailable:** it is intentionally Coming soon.
  Existing tier configuration reserves the Custom entitlement for a later
  release; it does not enable video generation now.
- **There is no social analytics or CRM attribution yet:** connected
  publishing, tracked links, approvals, and channel analytics are later work.

## Recommended test order

Run the no-image walkthrough first. It exercises the overhaul without a paid
media call. Once you are happy with the source review, channel drafts, manual
calendar, and posting pack, fund the Z.AI API account if needed and make **one**
image-generation call from Create. Inspect the result and Library status before
trying Image chat or additional variations.
