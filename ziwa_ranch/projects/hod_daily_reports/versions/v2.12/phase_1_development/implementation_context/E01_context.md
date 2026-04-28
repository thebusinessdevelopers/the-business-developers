# E-01 — Implementation context: Auto-save must not navigate away from the form

## Item summary

Stale offline queue retries were calling `onSuccess` (and `clearDraft`) whenever `item.departmentId` matched the mounted form, so a completed submission for another report date or submitter replaced the form with the success state; the fix is to gate that path on the current `reportDate` and normalised `submittedBy` as well.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `portal/components/FormRenderer.tsx` | Extend the `useSubmissionQueue` success callback with a three-condition guard before `clearDraft` / `onSuccess` | Anonymous callback passed to `useSubmissionQueue` |

## DB migration required

N

## Dependencies

None.

## Complexity

XS — single callback guard in one file; `QueuedSubmission` already carries `reportDate`.

## Validation steps

1. Queue a report offline (same department), reload or open a new report for a **different** `reportDate`, go online: when the queued item completes, the visible form must **not** switch to the submitted/success state and must **not** clear the wrong draft.
2. With a stale queued item for the same department but **different** submitter name than the live form, confirm completion does **not** invoke the parent `onSuccess`.
3. Submit successfully online for the **current** department, date, and name: `onSuccess` must still run and drafts clear as today.
4. Paged flow: use **Next** between sections while a matching queued item completes in the background; confirm only the guarded path is affected (no accidental submit from **Next** — already `type="button"`).

## Exact diff (authoritative for Chat 5)

### `portal/components/FormRenderer.tsx` (lines 143–148)

**Current code (exact):**

```tsx
  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
    if (item.departmentId === departmentId) {
      clearDraft(item.submittedBy)
      onSuccess(reportId)
    }
  })
```

**Replacement block (guard + existing body inside):** compare `submittedBy` with trim + lower-case so minor casing/whitespace differences do not skip a legitimate match.

```tsx
  const normaliseSubmitter = (s: string) => s.trim().toLowerCase()
  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
    if (
      item.departmentId === departmentId &&
      item.reportDate === reportDate &&
      normaliseSubmitter(item.submittedBy) === normaliseSubmitter(submittedBy)
    ) {
      clearDraft(item.submittedBy)
      onSuccess(reportId)
    }
  })
```

```diff
-  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
-    if (item.departmentId === departmentId) {
-      clearDraft(item.submittedBy)
-      onSuccess(reportId)
-    }
-  })
+  const normaliseSubmitter = (s: string) => s.trim().toLowerCase()
+  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
+    if (
+      item.departmentId === departmentId &&
+      item.reportDate === reportDate &&
+      normaliseSubmitter(item.submittedBy) === normaliseSubmitter(submittedBy)
+    ) {
+      clearDraft(item.submittedBy)
+      onSuccess(reportId)
+    }
+  })
```

### `portal/hooks/useSubmissionQueue.ts`

No change. `reportDate` is already on the queued-item type (`QueuedSubmission` in `portal/lib/local-storage.ts`).

## Call-sites (grep `onSuccess`)

`grep` over `portal/` for `onSuccess` on `FormRenderer` parents:

| File:line | Context | Affected by fix? |
|-----------|---------|------------------|
| `portal/app/report/[slug]/new/NewReportForm.tsx:84–87` | `setLastReportId`, `setSubmitted(true)` — success screen replaces the form (the reported bug). | Yes — guard stops stale queue completions from firing this; intentional submits unchanged. |
| `portal/app/report/[slug]/edit/[id]/EditReportForm.tsx:54` | `setSaved(true)` only — no navigation away. | Yes — compatible; edit path does not enqueue (`queueSubmission` only in create branch when network fails). |
| `portal/app/report/[slug]/view/[id]/ViewReportContent.tsx:17` | No-op `() => {}`. | Yes — compatible. |

**No call-site changes required** — behaviour is corrected inside `FormRenderer`.

Other `onSuccess` hits (e.g. `RoomsTab.tsx`) are not `FormRenderer` props.

## Evidence

- **Primary cause:** `FormRenderer.tsx` queue callback only checked `item.departmentId === departmentId` before `clearDraft` / `onSuccess` — `143:148:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`.
- **`submittedBy` in scope:** derived in component body — `115:115:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx` (`const submittedBy = nameSelection === '__other__' ? customName.trim() : nameSelection`). No new prop or context.
- **`reportDate` on queued items:** type `QueuedSubmission`, field `reportDate: string` — `17:20:ziwa_ranch/projects/hod_daily_reports/4_development/portal/lib/local-storage.ts`. Enqueue passes `reportDate` — `384:387:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx` (`queueSubmission({ departmentId, reportDate, ... })`). Retry POST uses `item.reportDate` — `85:86:ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSubmissionQueue.ts`.
- **Next button not implicit submit:** `SectionProgress.tsx` — Next is `type="button"` — `60:66:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/form/SectionProgress.tsx`.
- **Flush path only persists drafts:** `flushDraft` calls `saveDraft` only — `188:196:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`; `addSessionFlushListener(flushDraft)` — `198:200:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`; unload listeners call `saveDraft` only — `205:212:ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`. `session-flush.ts` invokes the registered flusher on `SESSION_EXPIRING_EVENT` — `11:24:ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/session-flush.ts` (no `submit-report` or `handleSubmit`).

**Secondary candidates (ruled out):**

- **Paged Next as submit:** Next uses `type="button"` — not ruled out as “never submit” (last section still has `type="submit"`), but **Next** does not submit the form.
- **Session flush / unload:** Only `saveDraft` via `flushDraft` / `persistOnUnload`; `session-flush` wires the listener to the async flusher — no navigation or `onSuccess`.
