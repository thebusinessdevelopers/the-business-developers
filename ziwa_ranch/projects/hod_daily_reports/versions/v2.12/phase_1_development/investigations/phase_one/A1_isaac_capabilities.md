# A-01 — Isaac admin capabilities: investigation

**Item:** A-01 (Track A — Head Office cannot access Room Management tab)  
**Investigator:** Chat 1 parent agent (Supabase + code review)  
**Date:** 20 Apr 2026  
**Status:** final

---

## Question

Does `admin.isaac` currently have the `accommodation_manage` capability needed to use the Room Management tab?

---

## Evidence

### DB state — `hod_users` row for Isaac

```
username        | role  | admin_tier | admin_title         | is_active
admin.isaac     | admin | standard   | Head Office Manager | true
headoffice.isaac| hod   | null       | null                | true
```

Isaac holds two accounts: an admin account (`admin.isaac`) and an HOD account (`headoffice.isaac`).

### Capability model — `admin-portal/lib/admin-auth.ts`

Lines 10, 26–39:

```10:39:ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/admin-auth.ts
const VIEW_ONLY_ADMINS = new Set(['admin.royfamily'])
// ...
const VIEWER_CAPABILITIES = new Set<AdminCapability>([
  'overview',
  'report_view',
  'analysis',
])

function resolveAccessLevel(username: string): 'full' | 'viewer' {
  return VIEW_ONLY_ADMINS.has(username) ? 'viewer' : 'full'
}

export function hasAdminCapability(admin: AdminUser, capability: AdminCapability): boolean {
  if (admin.access_level === 'full') return true
  return VIEWER_CAPABILITIES.has(capability)
}
```

`accommodation_manage` is listed among `AdminCapability` values (line 24) and is therefore granted to any admin whose `access_level` resolves to `'full'`.

---

## Finding

**`admin.isaac` already has `accommodation_manage`.** He is not in `VIEW_ONLY_ADMINS`, so `resolveAccessLevel` returns `'full'`, and `hasAdminCapability` short-circuits to `true` for every capability.

The premise of A-01 as originally stated in the backlog ("Isaac may not have accommodation_manage") is **incorrect**. No capability change is needed.

---

## Revised A-01 scope

The likely real cause of Head Office not seeing Room Management is one of:

1. **Account confusion** — Head Office staff may be logging in with `headoffice.isaac` (HOD portal) rather than `admin.isaac` (admin portal).
2. **UI visibility** — the Room Management tab may be conditionally rendered on a capability the implementation doesn't match (worth a visual check of `app/accommodation/page.tsx`).
3. **Onboarding gap** — Isaac may not know the admin portal URL or credentials for `admin.isaac`.

**Recommended action:**
- Confirm with Joshua / Isaac which account he is using when he reports he cannot access Room Management.
- If he is on the HOD portal, provide the admin portal URL and credentials for `admin.isaac`.
- If he is on the admin portal and still cannot see the tab, escalate to implementation-context stage (Chat 3) to trace the UI visibility condition.

**No DB migration required. No code change expected unless step 2 surfaces a real bug.**

---

## File index

- DB table inspected: `public.hod_users` (rows 6 returned for Florence/Julie/Faith/Isaac/Salim)
- Code inspected: [`4_development/admin-portal/lib/admin-auth.ts`](../../../4_development/admin-portal/lib/admin-auth.ts)
- UI gate to check in Chat 3: `4_development/admin-portal/app/accommodation/page.tsx`
