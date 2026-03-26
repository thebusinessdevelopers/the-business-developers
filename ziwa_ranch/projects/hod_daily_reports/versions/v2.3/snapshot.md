# HOD Daily Reports — Version 2.3 Snapshot

> **Purpose:** Point-in-time record of Version 2.3. Documents all changes from v2.2.
>
> **Built on:** 26 March 2026
> **Status:** v2.3 built on dev branch. Pending deploy to dev preview URLs.
> **Base version:** v2.2 (see `versions/v2.2/snapshot.md`)

---

## What v2.3 is

Four targeted changes: better UX for inventory grids, a complete admin identity system, comprehensive activity tracking, and a new department.

- **S1 — InventoryGrid remove buttons.** Active items in F&B, Kitchen, and Store inventory grids now have an explicit remove (X) button. Previously removal required clicking the item name again (a hidden toggle). The `minItems` prop is now enforced — when at minimum count, the remove button is hidden.
- **S2 — Individual admin accounts.** The single shared `ADMIN_PASSWORD` has been replaced with 7 per-user admin accounts (MD, CEO, Chairman, GM, Isaac, Wycliffe, Joshua) backed by `hod_users` and `hod_sessions`. Each admin has a tier (senior/standard) and a display title. Login uses a user picker + password pattern.
- **S3 — Comprehensive activity tracking.** All admin API routes now log activity with the admin's `user_id`. New action types: `admin_login`, `admin_logout`, `report_reviewed`, `report_viewed`, `report_deleted`, `report_date_changed`. The activity page has an "Admin Activity" tab visible only to senior-tier admins (MD, CEO, Chairman, Joshua).
- **S4 — Head Office department.** New 16th department for the Kampala-based reservations team. Form covers confirmed/provisional bookings by channel, cancelled bookings, activities booked for tomorrow, POPs received, confirmed payments, and special requests with an approval picker. Three user accounts: Florence (HOD), Julie, Isaac (substitutes).

---

## Database changes

| Change | What it does |
|---|---|
| `admin_tier` column on `hod_users` | `text default null`, constrained to `('senior', 'standard', null)`. Determines admin activity visibility. |
| `admin_title` column on `hod_users` | `text default null`. Display title for admin accounts (e.g. "Managing Director"). |
| 6 new admin accounts | `admin.md`, `admin.ceo`, `admin.chairman`, `admin.gm`, `admin.isaac`, `admin.wycliffe` with appropriate tiers. |
| `admin.joshua` updated | Set to `admin_tier = 'senior'`, `admin_title = 'Project Admin'`. |
| `Head Office` department | New row in `hod_departments`: slug `head-office`, sort_order 16. |
| 3 Head Office user accounts | `headoffice.florence`, `headoffice.julie`, `headoffice.isaac` with role `hod`. |

Migration file: `012_v2_3_schema.sql`

---

## New and modified files

### Shared package (`packages/shared/`)

| File | Change |
|---|---|
| `types/index.ts` | Added `admin_tier` and `admin_title` to `HodUser`. New `AdminUser` interface. |

### HOD Portal — modified files

| File | Change |
|---|---|
| `components/InventoryGrid.tsx` | Explicit remove (X) button on active items. `minItems` enforcement hides button when at minimum. Restructured card header: active items show name + X, inactive items show name + previous value hint. |
| `config/forms.ts` | Added Head Office department form config (8 sections: confirmed bookings, provisional bookings, cancelled bookings, activities, POPs, confirmed payments, special requests, notes). |
| `config/login-users.ts` | Added Head Office entry with Florence, Julie, Isaac. |

### Admin Portal — new/modified files

| File | Change |
|---|---|
| `lib/admin-auth.ts` | **Rewritten.** Session-based auth replacing HMAC. Exports: `verifyAdminAuth`, `getAdminUser`, `adminLogin`, `adminLogout`, `logAdminActivity`, `getSessionCookieConfig`. |
| `app/actions.ts` | **Rewritten.** `loginAction` now accepts username + password, creates session in `hod_sessions`, sets `admin_session` cookie. Logs `admin_login` and `admin_logout` activity. Uses `useActionState` pattern. |
| `app/LoginForm.tsx` | **Rewritten.** User picker with 7 admin accounts (radio buttons) + password field. Replaces single password input. |
| `app/layout.tsx` | Session-based auth check via `getAdminUser()`. Displays admin name and title in header. Wider login card for user picker. |
| `app/LogoutButton.tsx` | Unchanged — still calls `logoutAction`. |
| `app/api/edit-report/route.ts` | Activity log now includes admin `user_id` and `admin_title`. Editor name from admin identity. |
| `app/api/review-report/route.ts` | Added `report_reviewed` activity logging with admin user ID. |
| `app/api/delete-report/route.ts` | Added `report_deleted` activity logging with admin user ID. |
| `app/api/change-report-date/route.ts` | Added `report_date_changed` activity logging. Editor name from admin identity. |
| `app/api/batch-review-reports/route.ts` | Added `report_reviewed` activity logging (batch flag). |
| `app/reports/[id]/page.tsx` | Logs `report_viewed` when admin opens report detail. |
| `app/reports/[id]/edit/page.tsx` | Passes admin identity as `editorName` to form. |
| `app/reports/[id]/edit/AdminEditForm.tsx` | Accepts `editorName` prop instead of hardcoded "Admin". |
| `app/activity/page.tsx` | **Rewritten.** HOD/Admin Activity tabs (admin tab visible only to senior tier). Expanded `ACTION_LABELS` and `ACTION_COLOURS` for all new action types. Rich metadata display for date changes, batch reviews. |
| `config/forms.ts` | Added Head Office department form config. |

---

## Admin account details

| Username | Display Name | Title | Tier |
|---|---|---|---|
| `admin.joshua` | Joshua | Project Admin | senior |
| `admin.md` | MD | Managing Director | senior |
| `admin.ceo` | CEO | Chief Executive Officer | senior |
| `admin.chairman` | Chairman | Chairman | senior |
| `admin.gm` | GM | General Manager | standard |
| `admin.isaac` | Isaac | Head Office Manager | standard |
| `admin.wycliffe` | Wycliffe | Staff Manager | standard |

All accounts use password `ziwa2026`. Senior-tier users can see the "Admin Activity" tab. Standard-tier users only see HOD activity.

---

## Activity tracking (v2.3)

| Action | Trigger | Logged since |
|---|---|---|
| `admin_login` | Admin logs in | v2.3 |
| `admin_logout` | Admin logs out | v2.3 |
| `report_reviewed` | Admin marks report as reviewed | v2.3 |
| `report_viewed` | Admin opens report detail page | v2.3 |
| `report_edited` | Admin edits a report | v2.2 (now with admin `user_id`) |
| `report_deleted` | Admin deletes a report | v2.3 |
| `report_date_changed` | Admin changes report date | v2.3 |

All admin activity rows include `user_id` (admin's UUID) and `admin_title` in metadata.

---

## Head Office form sections

1. **Confirmed Bookings** — number steppers: Bookings Portal, WhatsApp, Phone, Walk-Ins
2. **Provisional Bookings** — same stepper pattern
3. **Cancelled Bookings** — repeater: company name, reason, arrival date, departure date, other info (optional)
4. **Activities Booked for Tomorrow** — steppers: Rhino Trekking, Shoebill Trekking, Night Walk, Nature Walk, Birding
5. **POPs Received** — repeater: company name, amount paid, arrival date, departure date, other info (optional)
6. **Confirmed Payments** — repeater: company name, amount received, other info (optional)
7. **Special Requests** — repeater: company name, request, approved by (select: Chairman/CEO/MD/GM)
8. **Notes** — standard textarea

Users: `headoffice.florence` (HOD), `headoffice.julie` (substitute), `headoffice.isaac` (substitute).

---

## What v2.3 does NOT include (noted)

- Craft Shop form glitch: investigated, concluded likely session timeout, not a code bug. Monitoring.
- No new AI features.
- No deploy repo updates (pending deploy).

---

*Snapshot created: 26 March 2026.*
