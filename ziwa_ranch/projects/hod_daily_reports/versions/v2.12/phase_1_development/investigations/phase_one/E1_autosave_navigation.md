# E-01 — Auto-save navigating-away bug (root cause)

## 1. Summary

The behaviour Salim sees (form replaced by the “Report submitted” success state while still filling in) is not driven by the 30-second auto-save timer. Auto-save only persists drafts to `hod_drafts` (and localStorage). The success UI is triggered when `NewReportForm` receives `onSuccess` from `FormRenderer`, which sets `submitted` and swaps the whole view for the thank-you screen. That path is incorrectly invoked when an **older, offline-queued submission** for the **same department** completes in the background: the `useSubmissionQueue` success callback fires `onSuccess` after only checking `item.departmentId === departmentId`, with no tie to the **current report date** or **current submitter**, so a stale queue resolution looks like a fresh submit and clears the wrong draft key (`item.submittedBy` vs the live form).

## 2. `onSuccess` call-site map

| Location | Preconditions | Effect |
|----------|----------------|--------|
| `FormRenderer.tsx` ~143–148 — callback passed to `useSubmissionQueue` | A queued item finishes retry with `res.ok` or `res.status === 409` (`useSubmissionQueue.ts` ~93–102). `onRetrySuccess` runs. Inside the callback: `item.departmentId === departmentId` (current form’s department). **No** check that `item.reportDate === reportDate` or that the succeeded item matches the user’s current draft session. | `clearDraft(item.submittedBy)` then `onSuccess(reportId)`. |
| `FormRenderer.tsx` ~344–358 — `handleSubmit`, edit branch | `effectiveEditMode && effectiveEditReportId`, validation passed, `POST /api/edit-report` succeeds (`res.ok`), not `noChanges`. | `onSuccess(effectiveEditReportId)` then `return`. |
| `FormRenderer.tsx` ~361–377 — `handleSubmit`, create branch | Not edit mode, validation passed, `POST /api/submit-report` succeeds (`res.ok`). | `clearDraft(submittedBy)` then `onSuccess(result.reportId)`. |

**Parents passing `onSuccess` into `FormRenderer` (portal):**

| File | Behaviour when `onSuccess` runs |
|------|----------------------------------|
| `portal/app/report/[slug]/new/NewReportForm.tsx` ~84–87 | `setLastReportId`, `setSubmitted(true)` → success screen (user perceives “taken away” / “marked submitted”). |
| `portal/app/report/[slug]/edit/[id]/EditReportForm.tsx` ~54 | `setSaved(true)` only. |
| `portal/app/report/[slug]/view/[id]/ViewReportContent.tsx` ~17 | No-op `() => {}`. |

**`FormRenderer.tsx` excerpts (call sites):**

```138:148:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx
    draftScope,
  })

  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
    if (item.departmentId === departmentId) {
      clearDraft(item.submittedBy)
      onSuccess(reportId)
    }
  })
```

```343:358:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx
    try {
      if (effectiveEditMode && effectiveEditReportId) {
        const res = await fetch('/api/edit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: effectiveEditReportId,
            reportData: values,
            submittedBy,
          }),
        })
        const result = await res.json()
        if (!res.ok) { setError(result.error || 'Failed to save edit.'); setSubmitting(false); return }
        if (result.noChanges) { setError('No changes detected.'); setSubmitting(false); return }
        onSuccess(effectiveEditReportId)
        return
      }
```

```360:378:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx
      const res = await fetch('/api/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId, reportDate, reportData: values, submittedBy,
          stockConfig: config.stockConfig ?? null,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        if (res.status === 409 && result.duplicateId) setDuplicateReportId(result.duplicateId)
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      clearDraft(submittedBy)
      onSuccess(result.reportId)
```

**Flagged queue resolution (`useSubmissionQueue.ts`):** after a successful `/api/submit-report` for a queue item, `onRetrySuccess?.(item, reportId)` is invoked (~102), which reaches the `FormRenderer` callback above.

## 3. Primary root cause — confirmed

**Cause:** Stale **submission queue** success handling in `FormRenderer` — `onSuccess` (and `clearDraft`) run for any succeeded queue item whose `departmentId` matches the mounted form, even when that item belongs to a **different report date** and/or **different submitter** than the form currently being edited.

**Evidence:** `FormRenderer.tsx` ~143–147 — condition is only `item.departmentId === departmentId`.

**Scenario:** Salim (or any HOD) previously had a network failure; `handleSubmit` queued a payload (`queueSubmission` in `FormRenderer.tsx` ~383–387). He returns later, opens a **new** report for the same department (e.g. different date or same department home flow). While filling, the background `retryPending` loop (`useSubmissionQueue.ts` ~64–145, ~155–185) completes the **old** queued item. The callback clears a draft by **`item.submittedBy`** and calls **`onSuccess`**. `NewReportForm` then sets `submitted` → the form is replaced by the success state. This can coincide with auto-save “Draft saved” messaging, so it is easy to attribute to auto-save.

## 4. Secondary candidates

| Candidate | Valid secondary issue? | Evidence |
|-----------|------------------------|----------|
| Paged “Next” as `type="submit"` | **No** for “Next”. | `SectionProgress.tsx` ~59–66: **Next** is `type="button"` with `onClick={onNext}`. The **last** section control is intentionally `type="submit"` (“Submit Report”) ~51–58 — same as non-paged flows, not a mistaken Next. |
| `pagehide` / `beforeunload` / session flush → `handleSubmit` or `/api/submit-report` | **No.** | `FormRenderer.tsx` ~188–196 `flushDraft` → `saveDraft` only. ~198–200 registers `addSessionFlushListener(flushDraft)`; `session-flush.ts` only invokes the passed flusher on `SESSION_EXPIRING_EVENT`. ~202–221 `pagehide`/`beforeunload` call `saveDraft` only. `SessionGuard.tsx` uses `useSessionTimer` → `endClientSession` / idle checks — no form submit. |

## 5. Auto-save timer sanity check

**Confirmed:** `scheduleSave` only schedules `saveDraft`.

**Evidence:** `useDraftManager.ts` ~132–136 — `setTimeout(() => saveDraft(data), 30_000)`. `saveDraft` (~109–125) writes localStorage and upserts `hod_drafts` only. `FormRenderer.tsx` ~160–170 wires `scheduleSave(draft)` from draft state changes — no `handleSubmit` or `queueSubmission` on that path.

## 6. Minimal fix (prose, no code)

In the `useSubmissionQueue` success callback registered in `FormRenderer`, **do not** call `onSuccess` or treat the outcome as “this screen’s submit” unless the succeeded **queue item** matches the **current form session**. At minimum, require **`item.reportDate === reportDate`** and **`item.submittedBy` (normalised) matches the form’s current `submittedBy`**, in addition to the existing `item.departmentId === departmentId`. Optionally, only run `clearDraft` / success navigation when the queue item is the one the user explicitly queued from **this** mount (e.g. track last queued id in a ref and match `item.id`), if stricter deduplication is needed. Until those guards exist, any cross-date same-department queue completion can still fire `onSuccess` incorrectly.

## 7. File index (absolute paths examined)

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useDraftManager.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSubmissionQueue.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/SessionGuard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSessionTimer.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/form/SectionProgress.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/new/NewReportForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/session-flush.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/edit/[id]/EditReportForm.tsx` (parent `onSuccess` — grep)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/view/[id]/ViewReportContent.tsx` (parent `onSuccess` — grep)

**Decision:** Implement the guard on the queue success path (`FormRenderer.tsx` ~143–147) before treating the event as user completion of the visible form; auto-save and unload listeners require no change for this specific defect.
