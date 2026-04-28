# D-04 — Implementation context: Regenerate-with-feedback prompting

## Item summary

Optional admin `feedback` is validated (max 500 characters), never persisted, and prepended to the user message for period analysis, daily brief, and weekly brief OpenRouter calls when non-empty.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `admin-portal/app/api/analysis/generate/handler.ts` | Parse `feedback`; build optional `[USER INSTRUCTION] … [/USER INSTRUCTION]` prefix at start of user `content`; validate length | `POST` |
| `admin-portal/app/api/daily-digest/handler.ts` | Same injection in the user `content` string; if v2.12 adds forced regeneration, expose it via a new `POST` (see below) that skips/invalidates cache and calls the same generation path | `GET` today; `POST` to add if `DailyDigestCard` ships Regenerate |
| `admin-portal/app/api/daily-digest/route.ts` | Export `POST` from handler when daily Regenerate is in scope | re-export |
| `admin-portal/app/api/analysis/weekly-brief/route.ts` | Parse `feedback`; same prefix on user `content` | `POST` |
| `admin-portal/app/analysis/AnalysisPanel.tsx` | State + textarea; pass `feedback` in `fetch` body | `generateAnalysis`, primary / cached Regenerate flows |
| `admin-portal/components/DailyDigestCard.tsx` | v2.12 default: Regenerate button + textarea; `POST /api/daily-digest` with `force` + optional `feedback` | `DailyDigestCard`, `fetchDigest` pattern |

## DB migration required

N — feedback is transient; must not be persisted.

## Dependencies

- D-03 (optional) — if daily-brief goes background, the kick-off body carries `feedback` too.

## Complexity

S — three parallel prompt prefixes plus UI wiring; no schema or cache shape changes.

## Validation steps

1. Period analysis: submit optional feedback, regenerate, confirm model output reflects steering without a new DB row for feedback.
2. Confirm `hod_analysis_cache` upserts still only store existing `analysis_data` / digest / brief payloads (no `feedback` key).
3. Send feedback longer than 500 characters (client bypass attempt) and confirm API returns 400 or truncates per server policy.
4. Inspect server logs during regeneration and confirm full request bodies (including feedback) are not printed.

## Exact diffs (authoritative for Chat 5)

### admin-portal/app/api/analysis/generate/handler.ts (~line 310)

Define once after parsing/validating `feedback` (e.g. `const feedbackPrefix = typeof feedback === 'string' && feedback.trim().length > 0 ? \`[USER INSTRUCTION] ${feedback.trim().slice(0, 500)} [/USER INSTRUCTION]\n\n\` : ''`).

```diff
         {
           role: 'user',
-          content: `Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).
+          content: `${feedbackPrefix}Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).

 DEPARTMENT NOTES:
 ${departmentNotes.length > 0 ? departmentNotes.join('\n') : 'No substantive notes in this period.'}
```

### admin-portal/app/api/daily-digest/handler.ts (~line 199)

Same `feedbackPrefix` pattern (only when `feedback` is available on the request for the POST/regenerate path; omit for plain GET).

```diff
         {
           role: 'user',
-          content: `Daily brief for ${briefDate}. ${reports.length} of ${totalDepts} departments reported.\n\n${departmentSections.join('\n\n')}${missingDepts.length > 0 ? `\n\nNot yet reported: ${missingDepts.join(', ')}` : ''}${contextBlock}`,
+          content: `${feedbackPrefix}Daily brief for ${briefDate}. ${reports.length} of ${totalDepts} departments reported.\n\n${departmentSections.join('\n\n')}${missingDepts.length > 0 ? `\n\nNot yet reported: ${missingDepts.join(', ')}` : ''}${contextBlock}`,
         },
```

### admin-portal/app/api/analysis/weekly-brief/route.ts (~line 195)

Prefix only the first line of the template; the blank line and `DEPARTMENT NOTES` / `NUMERIC METRICS` blocks stay as today.

```diff
         {
           role: 'user',
-          content: `Weekly management brief for ${weekStart} to ${weekEnd}.
+          content: `${feedbackPrefix}Weekly management brief for ${weekStart} to ${weekEnd}.

 ${reports.length} reports from ${deptReportDays.size} departments. ${urgentFlagCount} urgent flags this week.

 DEPARTMENT NOTES:
 ${departmentSummaries.length > 0 ? departmentSummaries.join('\n') : 'No substantive notes this week.'}
```

### admin-portal/app/analysis/AnalysisPanel.tsx (lines 200–263)

- **Placement:** Add the textarea in the same vertical block as the primary control — immediately after the flex row that ends at line 213 (`</div>` following the “Regenerate” / “Generate Analysis” button), before the `{error && (` block (line 215), so feedback sits beside/under the main regenerate row without duplicating the in-card “Regenerate” link (lines 257–263).
- **Limit:** `maxLength={500}` on the `<textarea>`; trim on submit; server rejects or truncates to 500 via `slice(0, 500)` after trim.
- **Fetch:** extend the existing call at lines 138–141:

```138:141:ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/AnalysisPanel.tsx
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_type: periodType, period_key: selectedKey, force }),
```

Add `feedback: trimmedFeedback || undefined` (or omit key when empty) inside `JSON.stringify({ ... })`. Thread `feedback` into `generateAnalysis(force, feedback?)` from both the primary button and the cached “Regenerate” link handler.

### admin-portal/components/DailyDigestCard.tsx (if v2.12 adds Regenerate)

- **Today:** only `GET /api/daily-digest` on mount and interval — no Regenerate control.

```63:80:ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx
  const fetchDigest = useCallback(() => {
    fetch('/api/daily-digest')
      .then((r) => r.json())
      ...
  }, [])

  useEffect(() => {
    fetchDigest()
    const interval = setInterval(fetchDigest, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchDigest])
```

- **Minimal addition:** state `feedback` + `regenerating`; a “Regenerate” control in the header row (line 132–140) next to the existing `text-xs text-indigo-400 ml-auto` span — match the small link pattern used in `AnalysisPanel` for secondary regenerate: `className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"`; optional `<textarea className="w-full mt-2 text-sm border border-indigo-100 rounded-lg px-2 py-1.5 ..." maxLength={500} placeholder="Optional: guidance for this regeneration…" />` using the same card shell `rounded-xl border border-indigo-100` as the parent.
- **Fetch:** `fetch('/api/daily-digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true, feedback: trimmed || undefined }) })` then merge response into `data` like the GET path.

## Evidence

- Investigation source: `versions/v2.12/../investigations/phase_one/D4_feedback_prompting.md` — injection lines, UI notes, non-persistence.
- Period analysis user message starts at `handler.ts` lines 308–316; injection at first line of template (line 310).
- `AnalysisPanel.tsx` fetch body: lines 138–141; primary button 200–207; cached Regenerate 257–263.
- Daily brief user message: `daily-digest/handler.ts` lines 197–199.
- Weekly brief user message: `weekly-brief/route.ts` lines 193–209; first line of user content line 195.
- `daily-digest/route.ts` exports **GET only**: `export { GET } from './handler'` — POST must be added if dashboard Regenerate ships.
- **`hod_analysis_cache` upserts (no `feedback` in objects today; planned implementation must keep it so):**
  - `app/api/analysis/generate/handler.ts` — `upsert({ period_type, period_key, analysis_data, generated_at, model_used })` at lines 349–356.
  - `app/api/daily-digest/handler.ts` — `upsert({ period_type: 'daily_brief', period_key: briefDate, analysis_data: digestData, generated_at, model_used })` at lines 233–241.
  - `app/api/analysis/weekly-brief/route.ts` — `upsert({ period_type: 'weekly_brief', period_key: cacheKey, analysis_data: briefData, generated_at, model_used })` at lines 241–248.
- **Logging to audit:** no `console.log` of request bodies in these files. Existing `console.error` calls: `generate/handler.ts` lines 365, 371; `daily-digest/handler.ts` lines 249, 255; `weekly-brief/route.ts` lines 257, 263. Do not add logging that dumps `body` or raw `feedback`.
- **Body validation:** none of the three routes use Zod. `generate/handler.ts` uses `const body = await request.json()` and `body as { period_type, period_key, force? }` at lines 110–111. `weekly-brief/route.ts` uses `request.json().catch(() => ({}))` and `Boolean((body).force)` at lines 26–27. **Recommendation:** add inline checks: `typeof feedback === 'string'`, trim, `feedback.length <= 500` (or slice after trim) at route/handler entry — **no schema file change.**

## Field name + type guard

- **Field name (Chat 2):** **`feedback`** — optional string, max 500 characters after trim.
- **Validation:** none of the three routes use Zod for the request body — **no schema file change**. Use inline guards at handler entry: `typeof feedback === 'string'`, trim, then length cap (`slice(0, 500)` or reject when `trimmed.length > 500`).
