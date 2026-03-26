# Phase 2 Build Log — WhatsApp Integration

> **Started:** 14 March 2026
> **Design doc:** `3_architecture/design_phase2.md`

---

## Setup checklist

### Track A — Meta Business setup (Joshua does this)

- [ ] **A1** — Meta Business Manager: verify business at [business.meta.com](https://business.meta.com)
- [ ] **A2** — Meta Developer Portal: create app (type: Business) at [developers.facebook.com](https://developers.facebook.com)
- [ ] **A3** — Add WhatsApp product to the app
- [ ] **A4** — Under WhatsApp > API Setup: note the test phone number, phone number ID, and WABA ID
- [ ] **A5** — Create a System User token (permanent — replaces the 24h test token)
- [ ] **A6** — Verify the real business phone number in the WABA
- [ ] **A7** — Create and submit message templates for Meta approval (see below)
- [ ] **A8** — Register the webhook URL once the endpoint is deployed

### Track B — Technical build (done in Cursor)

- [ ] **B1** — Add new Supabase tables (`hod_whatsapp_contacts`, `hod_whatsapp_sessions`) via migration
- [ ] **B2** — Build the webhook API route (`app/api/whatsapp/webhook/route.ts`)
- [ ] **B3** — Build the contact registration flow (first-time sender)
- [ ] **B4** — Build the conversation engine (form walking, session state, field types)
- [ ] **B5** — Build the report submission handler (writes to `hod_daily_reports`)
- [ ] **B6** — Add new environment variables to Netlify
- [ ] **B7** — Test with Meta's test number (sandbox)
- [ ] **B8** — Register webhook with Meta, test end-to-end with real number
- [ ] **B9** — HOD rollout: share the WhatsApp number

---

## Message templates (for Meta approval)

Meta requires pre-approved templates for any message the bot sends *first* (outside a 24h customer service window).

**Template: `daily_report_reminder`**
```
Good {{1}}, {{2}}. Don't forget your daily report for Ziwa Ranch. 
Reply REPORT to get started — it only takes a few minutes.
```
Variables: `{{1}}` = morning/afternoon/evening, `{{2}}` = HOD first name

*Note: For Phase 2 initial launch, HODs initiate — they message the bot. The reminder template is for Phase 2b (proactive outreach). Submit it early so it's approved when needed.*

---

## Progress log

| Date | What happened |
|---|---|
| 14 Mar 2026 | Phase 2 design document created. Meta Business account registration started. |

---

## Blockers / decisions pending

- Meta Business verification timeline — depends on how long Meta takes to review the registration
- Real business phone number to register — confirm with Joshua which number HODs should message
