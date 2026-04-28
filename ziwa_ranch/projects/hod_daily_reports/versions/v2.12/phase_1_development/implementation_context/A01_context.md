# A-01 — Implementation context: Isaac Room Management access

## Item summary

`admin.isaac` already resolves to full admin access, so `hasAdminCapability(admin, 'accommodation_manage')` is satisfied at runtime and the Room Management tab is reachable from the admin portal navigation — this is an onboarding / account-confirmation task, not a code change.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| — | No code changes required — capability check inspected at `admin-portal/app/accommodation/page.tsx:10` and `admin-portal/lib/admin-auth.ts:36` | `hasAdminCapability` |

## DB migration required

N — no schema change.

## Dependencies

None.

## Complexity

XS — evidence-only verification; no code, no migration.

## Validation steps

1. Sign in to the admin portal as `admin.isaac` (not `headoffice.isaac`; the HOD portal is a separate app — see investigation `phase_one/A1_isaac_capabilities.md` lines 18–27).
2. Open the top navigation menu (`admin-portal/app/NavMenu.tsx:13`, link labelled **Rooms**, `href: '/accommodation'`). Confirm the URL is `/accommodation` and the page title reads **Accommodation** (`AccommodationClient.tsx:89`) — not an immediate redirect to `/` (server gate: `admin-portal/app/accommodation/page.tsx:10`).
3. On the Accommodation screen select the **Room Management** tab (`AccommodationClient.tsx:79–83`). Confirm the Room Management UI loads (content routed from `RoomManagement` via `AccommodationClient.tsx:10–11`).
4. If tab still absent, escalate to Joshua — the capability is granted in code; any remaining gap is account, browser cache, or deployment-level.

## Evidence

- Runtime capability check: `admin-portal/lib/admin-auth.ts:36–38` — `hasAdminCapability` short-circuits `true` for `access_level === 'full'`.
- Route gate: `admin-portal/app/accommodation/page.tsx:10` — `if (!admin || !hasAdminCapability(admin, 'accommodation_manage')) redirect('/')`.
- No conditional branch treats `accommodation_manage` differently from other capabilities — confirmed by grep across `admin-portal/` (hits: type member at `admin-auth.ts:24`; page gate; API routes use identical `{ capability: 'accommodation_manage' }` guard pattern).
- `admin.isaac` is not in `VIEW_ONLY_ADMINS` (`admin-auth.ts:10`), so `resolveAccessLevel` returns `'full'`.
