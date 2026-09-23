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

## 3. Complete the core test flow

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
3. Review **Plan & Billing** so you know the limits on the test account.
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

If your test brief includes plan limits, approach a quota gradually. Confirm
that the product explains the limit before or when it is reached and does not
silently discard work.

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
- [ ] Agent created
- [ ] Conversation and follow-up tested
- [ ] Knowledge document uploaded and queried
- [ ] Lead created and pipeline reviewed
- [ ] Planner task created, edited, and completed
- [ ] Goal created and updated
- [ ] Analytics reviewed
- [ ] Profile or plan settings reviewed
- [ ] Return-use and responsive-layout passes completed
- [ ] Issues reported with reproducible steps
- [ ] Revamped Studio left for its announced beta release
