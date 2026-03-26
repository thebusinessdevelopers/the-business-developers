# Phase 2 — WhatsApp Business Integration Design

> **What this covers:** How HODs submit daily reports via WhatsApp instead of (or alongside) the web portal. Same database. Same form logic. Different entry point.
>
> **Started:** 14 March 2026
> **Status:** In setup — Meta Business account registration underway

---

## What Phase 2 adds

HODs message the Ziwa Ranch WhatsApp Business number. A bot guides them through their department's form conversationally — one section at a time. When complete, the report is stored in the same Supabase database as web portal submissions.

The web portal stays live. Phase 2 adds WhatsApp as a second submission channel, not a replacement.

---

## Architecture

```
[HOD on WhatsApp] → [Meta Cloud API] → [Webhook: Next.js API route] → [Supabase]
                                              ↕
                                    [Session state in Supabase]
```

- Meta hosts the WhatsApp Business API. No server required on our side — just a webhook endpoint.
- The webhook endpoint is an API route added to the existing Next.js app on Netlify.
- Conversation state (where the HOD is in their form) is stored in Supabase. This is necessary because Netlify is serverless — no memory between requests.
- The report is written to the same `hod_daily_reports` table as web portal submissions. No schema changes to existing tables.

---

## New database tables

### `hod_whatsapp_contacts`

Maps a WhatsApp phone number to a known HOD.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Unique identifier |
| `phone_number` | text (unique) | WhatsApp number in E.164 format (e.g. `+256700123456`) |
| `hod_name` | text | Matched name from `hod_departments.hods` |
| `department_id` | uuid (FK → hod_departments) | Their department |
| `registered_at` | timestamptz | When the contact was first registered |

### `hod_whatsapp_sessions`

Tracks an active conversation — which step the HOD is on and the partial data collected so far.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Unique identifier |
| `phone_number` | text (unique) | The WhatsApp sender |
| `current_step` | text | Which field/section is currently being collected |
| `session_data` | jsonb | Partial form data collected so far |
| `report_date` | date | The date the report covers |
| `started_at` | timestamptz | Session start |
| `updated_at` | timestamptz | Last message received |

Sessions are deleted when the report is submitted successfully.

---

## Conversation flow

### First-time contact (unregistered number)

```
HOD → "Hi" (or any message)
Bot → "Hi! I don't recognise this number yet. What's your name?"
HOD → "Salim"
Bot → "Got it — Salim from Security. Is that right? Reply YES to confirm."
HOD → "YES"
Bot → "Registered. You're ready to submit reports. Type REPORT to start your daily report."
```

The bot matches the name against all HOD names in `hod_departments`. If ambiguous (e.g. two people called David), it asks to clarify.

### Daily report (registered number)

```
HOD → "REPORT" (or any message on days they need to report)
Bot → "Good [morning/afternoon], [Name]. Let's do your daily report for today, [date].
       
       [Section 1 title]
       [Field 1 question]"
HOD → [answer]
Bot → "[Field 2 question]" (or next section heading + first field)
...
Bot → "That's everything. Here's your report summary:
       [Summary of all fields]
       
       Reply SUBMIT to confirm, or EDIT to change something."
HOD → "SUBMIT"
Bot → "Report submitted ✓. See you tomorrow."
```

### Commands

| Message | Response |
|---|---|
| `REPORT` | Starts the daily report flow |
| `EDIT` | During review step — returns to the start of the form |
| `CANCEL` | During a session — discards the session, confirms cancelled |
| `HELP` | Lists available commands |

---

## New API routes (added to Next.js app)

### `GET /api/whatsapp/webhook`
Meta verification endpoint. Returns the `hub.challenge` value when Meta sends a verification request during webhook setup.

### `POST /api/whatsapp/webhook`
Receives all incoming WhatsApp messages. Looks up the sender, routes them through the conversation logic, sends replies via the Meta Cloud API.

Both routes live in `app/api/whatsapp/webhook/route.ts` in the existing Next.js codebase.

---

## Form conversation design

Each department's form (currently in `config/forms.ts`) needs a WhatsApp-friendly version of each field. Rules:

- **text / textarea fields:** Bot asks the question, HOD replies with free text.
- **number fields:** Bot asks the question, HOD replies with a number. Bot validates it's numeric.
- **repeater fields:** Bot collects one row at a time. "Any more? Reply YES to add another, or NO to move on."
- **select fields:** Bot lists the options numbered. HOD replies with the number.
- **checkbox_group fields:** Bot lists options. HOD replies with numbers separated by commas.

The WhatsApp conversation config is separate from the web form config — same data, different UX.

---

## New environment variables

```
WHATSAPP_TOKEN=          # Meta access token (System User token for production)
WHATSAPP_PHONE_NUMBER_ID= # The phone number ID from Meta (not the number itself)
WHATSAPP_VERIFY_TOKEN=    # A string you choose — used to verify the webhook with Meta
WHATSAPP_APP_SECRET=      # App secret from Meta — used to validate incoming payloads
```

---

## Meta setup requirements

Before building, the following must be in place:

1. **Meta Business Manager** — business verified at [business.meta.com](https://business.meta.com)
2. **Meta Developer App** — type: Business, with WhatsApp product added
3. **WhatsApp Business Account (WABA)** — created inside the developer app
4. **Phone number** — verified and registered to the WABA (the number HODs will message)
5. **System User token** — a permanent access token (test tokens expire in 24h)
6. **Message templates** — approved by Meta (required for proactive outreach; for replies, free-form is allowed within 24h)
7. **Webhook registered** — the `/api/whatsapp/webhook` URL registered in the Meta app dashboard

---

## What Phase 2 does NOT include

- No read receipts or delivery confirmations shown to management
- No scheduled proactive messages (bot doesn't message HODs unprompted — they initiate)
- No multi-language support
- No image or voice note handling
- No editing a submitted report via WhatsApp

Proactive daily reminders (bot messages HODs at a set time) are considered for Phase 2b once the core submission flow is working.

---

*Phase 3 (AI verification agent) and Phase 4 (automated insights) have their own design documents when the time comes.*
