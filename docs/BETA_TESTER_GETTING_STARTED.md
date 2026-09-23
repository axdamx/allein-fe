# Allein beta tester getting started guide

Last updated: 2026-09-23

Welcome to the Allein beta. This guide helps you set up a test account, try the
main workflows, and report feedback that the product team can act on.

## What to prepare

- Use the beta URL and test account supplied by the Allein team.
- Start on a desktop browser for the clearest first run. You can test mobile
  layouts afterward.
- Keep a small sample document ready in TXT, Markdown, CSV, JSON, or PDF format.
- Use fictional or approved test contacts. Do not enter passwords, payment card
  details, private client notes, or confidential customer data.

Features and usage limits depend on the plan assigned to your test account. If
you see an upgrade message or usage limit earlier than expected, include it in
your feedback instead of repeatedly retrying the same action.

## 1. Create your account

1. Open the beta URL and choose **Sign up**.
2. Continue with Google, or enter an email address and password.
3. If you used email, complete the email confirmation when requested.
4. Sign in and choose the profession that best matches the work you want to
   test. This selects the initial assistant type and sample experience.
5. You should arrive at the **Dashboard**.

Record a bug if confirmation links fail, onboarding reappears after completion,
or your selected profession is not retained.

## 2. Take a quick tour

On the Dashboard, use **Take product tour** in the Getting Started card. Check
that the tour introduces the navigation, quick actions, and setup checklist.

The main areas are:

| Area | What it is for |
| --- | --- |
| Dashboard | See activity, usage, recent work, and setup progress |
| Chat | Ask an Allein assistant for help and continue conversations |
| Agents | Create and manage assistants for a role or workflow |
| CRM | Track leads, pipeline stages, and client records |
| Planner | Organize tasks in board or calendar view |
| Goals | Set goals, deadlines, progress, and milestones |
| Knowledge | Upload material that an agent can use as context |
| Analytics | Review account and workflow activity |
| Settings | Update your profile, plan, integrations, and API keys |
| Studio | Marketing content centre; the revamped experience is coming soon |

## 3. Upgrade through Stripe sandbox

The beta environment uses Stripe sandbox checkout, so you can test a paid plan
without making a real payment. For a complete beta pass, start on Free and
upgrade the same account to **Lite** or **Pro**.

1. Open **Settings → Plan & Billing**.
2. Choose **Upgrade securely** for Lite or Pro. Custom is handled through
   sales and is not a self-serve Stripe checkout option.
3. On the Stripe-hosted sandbox page, use Stripe's successful test Visa:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date, such as `12/34`
   - CVC: any three digits
   - Name, postcode, and other test fields: any valid-looking test values
4. Complete checkout. Stripe should return you to **Settings → Plan &
   Billing**.
5. Wait for **Upgrade confirmed**. The success view may briefly show that it
   is syncing while the Stripe webhook verifies the subscription.
6. Confirm the current plan badge, new limits, and **Subscription active**
   state. Refresh once and confirm the paid plan remains active.
7. Open **Manage billing** to verify that the Stripe sandbox customer portal
   loads. Return to Allein without changing the subscription unless your test
   brief includes cancellation.

Use only Stripe test details in the sandbox. Do not enter a real card. The
official test values are listed in [Stripe's testing documentation](https://docs.stripe.com/testing).
If the success page keeps waiting, report the checkout time, test account,
selected plan, and whether Stripe showed a successful payment. Do not include
secret keys or full payment details in the report.

A manually assigned complimentary plan cannot start a new self-serve checkout.
Use a Free beta account for this test or ask the beta coordinator to reset the
account. Once a Stripe subscription is active, plan changes and cancellation
are handled through **Manage billing**.

## 4. Understand account limits

The limits below are the current product configuration. They are enforced per
account, not per agent or conversation.

| Usage | Free | Lite | Pro | Custom | How it is counted |
| --- | ---: | ---: | ---: | ---: | --- |
| Price | RM0 forever | RM99/month | RM249/month | RM799+/month | Lite and Pro are available in sandbox checkout |
| Agents | 1 | 3 | 10 | Unlimited | Each created agent uses one lifetime slot; archiving does not restore it |
| Conversations | 10 | 100 | Unlimited | Unlimited | Each new conversation uses one lifetime slot; deleting it does not restore the slot |
| AI messages | 10/day | 30/day | Unlimited | Unlimited | Each submitted request uses one unit; regular Chat and Studio Image chat share this allowance |
| Saved marketing posts | 3/day | 30/day | 150/day | Unlimited | Saving a new post or duplicating one uses one unit; generating or editing copy does not |
| Knowledge documents | 3 | 25 | 200 | Unlimited | Each stored document uses one slot; deleting it restores the slot |
| CRM leads | 10 | 100 | Unlimited | Unlimited | Based on the current number of lead records; deleting a lead frees capacity |
| AI image generations | 0 | 0 | 100/month | 500/month | Every successful Generate or Regenerate attempt uses one unit, whether or not the result is kept |
| WhatsApp messages | 0/day | 50/day | Unlimited | Unlimited | Shared account allowance; access still depends on the WhatsApp feature flag |
| Telegram messages | 0/day | 100/day | Unlimited | Unlimited | Shared account allowance; the Telegram bot starts on Lite |

Daily allowances reset at midnight Malaysia time. Monthly image allowances
reset on the first day of the next Malaysia calendar month. Lifetime limits do
not reset automatically.

For AI images, a failed provider attempt that creates no ready Library image is
designed to return the reserved app credit. A successful result still counts
when the user dislikes or discards it because the provider has already created
the image. Admin and owner accounts can bypass the app image count for demos,
but the server's GLM-Image provider capacity is still consumed.

Deleting a saved marketing post does not return that day's post allowance.
Deleting a conversation does not return a lifetime conversation slot. These
are useful boundary cases to verify and report if the interface gives a
different expectation.

### Features by plan

| Feature | Free | Lite | Pro | Custom |
| --- | :---: | :---: | :---: | :---: |
| CRM and clients | Yes | Yes | Yes | Yes |
| Knowledge documents | Yes | Yes | Yes | Yes |
| Marketing Studio content management | Yes | Yes | Yes | Yes |
| Planned posts | No | Yes | Yes | Yes |
| AI image generation | No | No | Yes | Yes |
| Telegram bot | No | Yes | Yes | Yes |
| WhatsApp broadcast | No | No | Yes | Yes |
| Team seats | No | No | Yes | Yes |
| API access | No | No | Yes | Yes |
| Priority support | No | No | Yes | Yes |
| White label | No | No | No | Yes |
| AI video generation | Coming soon | Coming soon | Coming soon | Coming soon |

The revamped Studio is still coming soon on `main`, so Studio-specific limits
can be reviewed now but should be exercised only after that branch is deployed.

## 5. Understand upload limits

Uploads have different rules depending on where they are used.

| Upload area | Accepted content | Current limit | What counts |
| --- | --- | --- | --- |
| Knowledge Base | TXT, MD, CSV, JSON, PDF, and browser-recognized text files | Document count follows the plan table. The current Knowledge handler has no dedicated per-file byte cap, so use small beta files | A created document record uses one document slot; delete it to restore the slot |
| Chat attachment | PNG, JPEG, WebP, GIF, PDF, TXT, CSV, MD, or JSON | One attachment per message; maximum 10 MB | The upload itself has no separate plan counter; sending the request uses one daily AI message |
| CRM client import | CSV with a required `name` column | Maximum 500 rows per import | Imported client records are separate from the CRM lead count |
| Planner calendar import | ICS exported from a calendar service | One file at a time; no dedicated file-size or event-count cap is currently published | Imported events do not use an AI message, post, or document allowance |
| Studio Library image | PNG, JPEG, WebP, or GIF | Maximum 10 MB each; maximum 10 upload requests per minute | Uploading an owned image does not use an AI image-generation credit |
| Studio post images | Ready images from the Library | Up to 10 images attached to one post | Saving the post uses one daily post unit; attaching images adds no extra plan charge |

The Studio rows describe the upcoming revamped Studio and are **Coming soon**
until its branch is merged and deployed.

For Knowledge uploads, a PDF needs extractable text. A scanned image-only PDF
may fail with no text unless an OCR path can read it. Unsupported, corrupt, or
mislabeled files should show an actionable error. Large Knowledge files may
also encounter request or processing limits even though the current handler
does not publish a specific byte cap; record the file type and approximate size
when reporting that failure.

Chat and Studio media uploads are checked on the server as well as in the file
picker. Renaming an unsupported file to an accepted extension should not bypass
validation. SVG and HTML are intentionally not accepted.

## 6. Complete the core test flow

This first pass should take about 20 to 30 minutes. Use one fictional scenario
throughout so you can see how the product areas fit together.

### Create an agent

1. Open **Agents** and click **New Agent**.
2. Give the agent a clear purpose, such as “Property enquiry assistant.”
3. Complete the available instructions and settings, then click **Create
   agent**.
4. Confirm the new agent appears in the agent list and is still there after a
   page refresh.

Check that required fields are explained, errors are understandable, and saved
values reappear correctly when you return.

### Start a conversation

1. Open **Chat** and start a new conversation.
2. Select the agent you created if the interface asks for one.
3. Send a simple request with a clear expected answer.
4. Ask a follow-up that refers to the previous response.
5. Leave the page, return to the conversation, and confirm its history remains.

Review the answer for relevance and consistency. AI output can be incorrect, so
do not treat generated advice or factual claims as verified.

### Upload knowledge and use it in chat

1. Open **Knowledge** and upload your sample document.
2. Wait until processing is complete.
3. Ask a question whose answer appears clearly in that document.
4. Ask a second question whose answer is not in the document.

The grounded answer should reflect the uploaded material. The assistant should
not confidently invent missing details. If a PDF contains only scanned images,
text extraction may depend on the document and should be called out in your
feedback.

### Add a lead and review the pipeline

1. Open **CRM → Leads** and click **Add lead**.
2. Enter fictional contact details and save.
3. Open the lead, update an available field or status, and save again.
4. Open **Pipeline** and check that the lead appears in the expected stage.
5. Open **Clients** and create a fictional client if that feature is available
   on your test plan.

Check search, filters, empty states, validation, and whether the record remains
correct after a refresh.

### Plan a task

1. Open **Planner** and create a task related to the fictional lead.
2. Set a date, priority, and reminder if available.
3. Find the task in both **Board** and **Calendar** views.
4. Edit the task, then mark it complete.

Confirm that dates use your expected local time and that status changes are
shown consistently in both views.

### Create a goal

1. Open **Goals** and click **Add goal**.
2. Add a target and deadline.
3. Update its progress or milestones.
4. Refresh the page and confirm the changes remain.

### Review analytics and settings

1. Open **Analytics** and check whether your recent activity is reflected.
2. Open **Settings → Profile**, make a harmless change, save, and reload.
3. Review **Plan & Billing** and confirm it matches the plan selected during
   the Stripe sandbox upgrade.
4. Treat **Integrations** and **API Keys** as optional unless the beta brief
   specifically asks you to test them. Never include a secret key in a bug
   report or screenshot.

Analytics may not update instantly. Report the delay when recent activity is
still missing after a reasonable refresh.

## Revamped Studio — Coming soon

> **Coming soon:** The revamped Studio is still being developed on the
> `codex/studio-content-centre` branch. It has not been merged into `main`, so
> beta testers should not expect this workflow in the current main deployment.

The new Studio is being designed as a centre for preparing social media
content. The planned beta experience includes:

- a **Brand kit** for voice, audience, colors, hashtags, logo, and templates;
- **Sources** for reviewing and approving facts before they are used in copy;
- a full-page **Create** flow opened from a source or the content planner;
- separate channel versions for Instagram, Facebook, LinkedIn, X, and email;
- an image **Library** for uploads and AI-generated assets;
- an **Image chat** for conversational image creation and analysis;
- a content **Planner** with list and calendar views; and
- a posting pack for copying final text and downloading ordered images for
  manual publishing.

Studio will prepare content and assets, but the upcoming version will not
automatically publish to social networks. Video generation will also remain
labelled **Coming soon** during the first Studio beta.

AI image generation will require a Pro or Custom test account, available app
image credits, and funded GLM-Image API capacity on the server. Each successful
generation or regeneration uses provider capacity even if the tester later
chooses a different result. Failed attempts that produce no ready Library asset
are designed to return the reserved app credit.

Once the Studio branch is merged and deployed, use the separate
[Marketing Studio user guide](./STUDIO_USER_GUIDE.md) for the complete setup,
image-credit, and end-to-end testing flow. Until then, you may continue testing
the other product areas in this guide.

## Suggested beta test passes

After the quick start, repeat the most relevant flow from a few angles:

### First-use pass

Try the product without prior explanation. Record where labels, empty states,
or next steps are unclear.

### Return-use pass

Sign out and return later. Check whether your conversations, records, tasks,
goals, and settings remain correct.

### Error pass

Try a missing required field, an unsupported upload, and a temporary offline
state. Error messages should explain what happened and how to recover without
losing unrelated work.

### Layout pass

Repeat key actions at a narrower browser width or on a phone. Look for hidden
buttons, clipped text, unusable dialogs, and accidental horizontal scrolling.

### Limit pass

Before upgrading, try one feature that Free does not include and confirm that
the upgrade prompt explains which plan unlocks it. Complete the Stripe sandbox
upgrade, return to the same feature, and confirm it is now available.

Approach a small quota gradually and compare the usage indicator after every
action. Confirm that the product explains the limit before or when it is
reached, blocks only the metered action, and does not silently discard work.
There is no need to exhaust a 100- or 500-image allowance during routine beta
testing; use a specially prepared boundary account for high-limit tests.

## What feedback is most useful

Prioritize feedback in this order:

1. Data loss, security, privacy, or access to another user's information.
2. A blocked sign-up, sign-in, save, upload, or AI workflow.
3. Incorrect records, counts, plan limits, dates, or time zones.
4. Repeated errors, slow pages, or inconsistent behavior.
5. Confusing wording, missing guidance, and visual issues.
6. Ideas that would make a real workflow faster or clearer.

For product ideas, explain the task you were trying to complete and why the
current path made it difficult. That context is more useful than a feature name
alone.

## How to report an issue

Send one issue per report when possible. Include:

- **Summary:** a short description of the problem;
- **Area:** for example Chat, CRM, Planner, or Knowledge;
- **Steps:** the exact actions that reproduce it;
- **Expected:** what you thought would happen;
- **Actual:** what happened instead, including the full visible error;
- **Frequency:** every time, sometimes, or once;
- **Environment:** browser, device, account plan, and screen size;
- **Time:** date, time, and time zone;
- **Evidence:** a screenshot or short screen recording with private details
  removed; and
- **Impact:** blocked, major inconvenience, minor issue, or suggestion.

Example:

```text
Summary: New lead disappears after refresh
Area: CRM → Leads
Steps:
1. Click Add lead
2. Enter the sample contact and save
3. Refresh the page
Expected: The lead remains in the list
Actual: The list returns to the empty state
Frequency: 2 out of 2 attempts
Environment: Chrome, macOS, Pro test account, 1440 × 900
Time: 2026-09-23 15:20 MYT
Impact: Blocked from testing the pipeline
```

Do not send your password, authentication link, full API key, payment details,
or private customer data. If an issue exposes another user's data, stop testing
that path and report it immediately.

## Getting help

Open **Support** from the app navigation. The current support contacts are:

- General support: `support@allein.ai`
- Billing questions: `billing@allein.ai`

Include the issue-report details above so the team can reproduce the problem.
Live chat and in-app documentation are currently marked **Coming soon**.

## Completion checklist

- [ ] Account created and onboarding completed
- [ ] Product tour completed
- [ ] Lite or Pro upgrade completed through Stripe sandbox
- [ ] Upgraded plan and limits persisted after refresh
- [ ] Agent created
- [ ] Conversation and follow-up tested
- [ ] Knowledge document uploaded and queried
- [ ] One accepted upload and one rejected upload tested
- [ ] Lead created and pipeline reviewed
- [ ] Planner task created, edited, and completed
- [ ] Goal created and updated
- [ ] Analytics reviewed
- [ ] Profile, billing portal, and plan settings reviewed
- [ ] Return-use and responsive-layout passes completed
- [ ] Issues reported with reproducible steps
- [ ] Revamped Studio left for its announced beta release
