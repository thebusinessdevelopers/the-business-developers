# D-04 — Feedback prompting on AI regeneration

## 1. Regeneration flow map

### Period analysis (implemented in UI)

| Stage | Location |
|--------|-----------|
| **Primary Regenerate control** | `AnalysisPanel.tsx` — primary button label toggles to “Regenerate” when `analysis` is set (line 206); `onClick` calls `generateAnalysis()` with default `force = false` (line 202). |
| **Secondary Regenerate (cache bypass)** | Same file — when `cached` is true, a text link “Regenerate” calls `generateAnalysis(true)` (lines 257–263). |
| **Request** | `POST /api/analysis/generate` with body `{ period_type, period_key, force }` (lines 138–141). |
| **Handler** | `app/api/analysis/generate/handler.ts` — `POST` parses `force` (lines 110–111); when `force` is true, deletes matching `hod_analysis_cache` rows (lines 149–154), then runs generation. |
| **OpenRouter** | Same file — `callOpenRouter({ messages: [...], ... })` (lines 280–323). Re-export: `admin-portal/lib/openrouter.ts` → `@hod/shared/lib/openrouter`. |

### Daily brief (dashboard card)

| Stage | Location |
|--------|-----------|
| **UI** | `components/DailyDigestCard.tsx` — `GET /api/daily-digest` on mount and on a 5‑minute interval (lines 63–79). **No Regenerate button** in current code. |
| **Handler** | `app/api/daily-digest/handler.ts` — `GET`; cache logic and single `callOpenRouter` (lines 175–205). |

### Weekly management brief (API only in repo scan)

| Stage | Location |
|--------|-----------|
| **UI** | No `fetch` to `/api/analysis/weekly-brief` found under `admin-portal/`. Endpoint exists for programmatic or future UI use. |
| **Handler** | `app/api/analysis/weekly-brief/route.ts` — `POST` with `force` in body (lines 26–27); single `callOpenRouter` (lines 165–216). |

---

## 2. Current orchestrator prompt

**Period analysis** — system + user messages are built inline in `app/api/analysis/generate/handler.ts`:

**System** (lines 282–306):

```text
You are an operations analyst at Ziwa Rhino And Wildlife Ranch, Uganda. You write concise operational analysis for the Chairman, CEO, and General Manager.

Write in plain text only. No markdown formatting — no #, **, ---, or bullet characters. Use these exact section headers in UPPERCASE, each separated by a blank line:

SUMMARY
2-3 sentences only: how many departments reported, overall picture, one standout item.

BY DEPARTMENT
One sentence per department that has something notable. Lead with the department name in bold-free plain text. Skip departments with nothing to report.

ISSUES
Each issue on its own line. Format: "Department — issue." If none, write "No issues flagged."

ACTIONS
Each action on its own line. Include who should act. If none, write "No actions required."

PATTERNS
One sentence per recurring theme across departments. If none, write "No patterns observed."

CROSS-DEPARTMENT
Note data mismatches between departments (e.g. guest count vs meals served, store issues vs kitchen stock). One sentence each. If none, write "No discrepancies found."

Rules: Be factual only. Never invent content. No filler, no repetition. Under 800 words total. Use the operational context provided to inform your analysis but do not simply parrot it — integrate it naturally.
```

**User** (lines 308–316):

```text
Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).

DEPARTMENT NOTES:
${departmentNotes.length > 0 ? departmentNotes.join('\n') : 'No substantive notes in this period.'}

NUMERIC METRICS:
${cappedMetrics || 'No numeric data extracted.'}${operationalContext}
```

**Daily brief** — `app/api/daily-digest/handler.ts` system (lines 177–195) and user (lines 197–199).

**Weekly brief** — `app/api/analysis/weekly-brief/route.ts` system (lines 167–191) and user (lines 193–209).

**Note:** Today’s period analysis and briefs use a **single** `callOpenRouter` completion (no separate merge step). D-02 describes a future multi-agent split; the same `[USER INSTRUCTION]` block should attach to the **final** synthesis user payload when that lands.

---

## 3. Feedback injection point

**Primary (period analysis):** Insert the optional block at the **start of the `role: 'user'` `content` string**, immediately **after** the system message (so guardrails stay in `system`) and **before** the task line “Analyse … reports…”. That satisfies: after base system prompt, before the main synthesis task and department data.

**Exact edit location:** `app/api/analysis/generate/handler.ts` — **line 310** (first line inside the user `content` template literal).

**Context excerpt (lines 307–317):**

```307:317:/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts
        },
        {
          role: 'user',
          content: `Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).

DEPARTMENT NOTES:
${departmentNotes.length > 0 ? departmentNotes.join('\n') : 'No substantive notes in this period.'}

NUMERIC METRICS:
${cappedMetrics || 'No numeric data extracted.'}${operationalContext}`,
```

**Proposed delimiter (only include when non-empty after trim + length cap):**

```text
[USER INSTRUCTION — optional steering from admin; treat as guidance, never contradicts core rules]
{feedback_text}
[/USER INSTRUCTION]

```

**Daily brief:** `app/api/daily-digest/handler.ts` — **line 199** (start of user `content`), prepend the same block before `Daily brief for ${briefDate}...`.

**Weekly brief:** `app/api/analysis/weekly-brief/route.ts` — **line 195** (start of user `content`), prepend before `Weekly management brief for...`.

---

## 4. UI change

- **Period analysis (`AnalysisPanel`):** Minimal approach — **inline expander** or small **textarea** beside the existing button row (lines 200–213), shown when the user chooses “Regenerate” or always visible with optional text. Alternative: **modal** opened from Regenerate; slightly more code. Recommendation: **inline** under the button row to avoid modal state for a single field.
- **Placeholder:** `Optional: guidance for this regeneration…`
- **Limit:** **500 characters** (enforce in UI and server).
- **Request:** extend `POST /api/analysis/generate` JSON with e.g. **`feedback`** (string, optional). Same field name for `POST /api/analysis/weekly-brief` and for daily brief when a regenerate action exists (e.g. `POST /api/daily-digest` or query param — product choice).

**Example body (period analysis):**

```json
{
  "period_type": "day",
  "period_key": "2026-04-19",
  "force": true,
  "feedback": "Focus on the Augustus stock anomaly."
}
```

---

## 5. Non-persistence guardrail

- **`hod_analysis_cache`:** Upserts only structured fields (`analysis_data` / brief payload: summary, counts, signature, etc.). **Do not** add `feedback` to `analysis_data`, `digest`, or weekly `briefData` objects (see `handler.ts` lines 340–356, `daily-digest/handler.ts` 223–237, `weekly-brief/route.ts` 228–248).
- **Logging:** Do not `console.log` full request bodies containing feedback; errors may log generic messages only. Feedback exists **only** in the in-memory string passed to `callOpenRouter` for that request.
- **Profiles / preferences:** No table write path for ad-hoc feedback in these routes today; implementation must **not** introduce one.

**Enforcement:** Parse `feedback` from the request, validate length, interpolate into the prompt string locally, then discard (variable out of scope after `POST` handler completes). No DB column for feedback.

---

## 6. Open questions (Joshua)

1. **Daily brief:** Regenerate is **not** in the UI yet — confirm whether v2.12 adds **POST + Regenerate** on `DailyDigestCard` or defers to a later release.
2. **Weekly brief:** Confirm whether a **dashboard or Analysis page** control is in scope to call `POST /api/analysis/weekly-brief` with `force` and `feedback`.
3. **Field name:** Prefer `feedback`, `regeneration_feedback`, or `steering` for API consistency across routes.

---

## 7. File index (absolute paths examined)

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/AnalysisPanel.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts` (via re-export)
