# PRD 01 — Foundation

> **Covers:** Supabase project setup, full schema with RLS, authentication, onboarding wizard, organisation and user management, department template library, and department configuration.

---

## What we're building

The foundation layer: a working Supabase project with all V1 tables, RLS policies, and seed data; an authentication flow; a multi-step onboarding wizard for new organisations; and a settings area where an admin can manage their org, users, and departments.

This PRD is the prerequisite for everything else. Nothing in PRDs 02–05 can be built until this is complete.

---

## Why

A new lodge signing up to BMS needs to go from "account created" to "ready to receive daily reports" without calling support and without any custom development. The onboarding wizard is the commercial gateway: it must produce a working, configured organisation in under 30 minutes. The foundation also establishes the multi-tenant data model that everything else builds on — if this is wrong, everything else is wrong.

---

## Requirements

### Supabase schema

**R1.1** — All tables defined in `design.md` exist as Supabase migration files in `supabase/migrations/`. Each migration is numbered and atomic.

**R1.2** — Every tenant-scoped table (organisations, users, departments, reports, stock_items, stock_transactions, requisitions, purchase_orders, threads, messages, notifications, intelligence_briefs, intelligence_flags, invoices, payments, webhook_events, sync_queue) has Row Level Security enabled.

**R1.3** — The three RLS helper functions exist as SECURITY DEFINER functions: `get_user_org_id()`, `is_org_member(UUID)`, `get_user_role()`.

**R1.4** — Every tenant-scoped table has at minimum a SELECT policy using `is_org_member(org_id)`. INSERT, UPDATE, and DELETE policies are in place for all tables that support those operations, with appropriate role checks.

**R1.5** — TypeScript types are generated from the schema via `supabase gen types typescript` and committed to `types/database.ts`. All database access in the application uses these generated types.

**R1.6** — The nine department templates are seeded via `supabase/seed/department_templates.sql`: Kitchen, F&B Bar, Housekeeping, Security, Maintenance, Reception, Management, Conservation, Store. Each has a complete `form_schema` JSONB with at least three meaningful fields per template.

### Authentication

**R1.7** — A user can sign up with email and password. On sign-up, the system creates both a Supabase Auth user and a corresponding row in the `users` table with `role = 'owner'` and an `org_id` pointing to a newly created organisation.

**R1.8** — A user can log in with email and password and is redirected to their dashboard.

**R1.9** — A user who is not authenticated cannot access any `(app)/` route. They are redirected to `/login`.

**R1.10** — Session persistence: a user who closes the browser tab and reopens the app within 7 days remains logged in.

**R1.11** — An admin can reset another user's password from the settings area. The new password is saved to both `password_hash` (via Supabase Auth Admin API) and `password_display` (plain text in users table). This matches the HOD v2.5 pattern.

### Onboarding wizard

**R1.12** — The onboarding wizard is a multi-step flow at `/onboarding` accessible only to users with `onboarding_complete = false` on their organisation.

**R1.13** — Step 1 (Property setup): the user provides their organisation name, property type (lodge, hotel, resort, camp), location, and approximate room count. This data is saved to the `organisations` table.

**R1.14** — Step 2 (Department selection): the user is shown the nine available templates. They select which departments their property has. Each selected department creates a row in `departments` with `form_schema` copied from the template.

**R1.15** — Step 3 (Add team): the user can add department heads by name and phone number. Each HOD creates a row in `users` with `role = 'hod'` and `department_id` set to the relevant department. A temporary password is generated and shown to the admin for manual distribution (WhatsApp invite is a future enhancement).

**R1.16** — Step 4 (First submission): the wizard presents a guided prompt to submit a test report. If the admin submits one themselves, the submission appears in the admin dashboard and the wizard confirms it.

**R1.17** — On completion of all four steps, `organisations.onboarding_complete` is set to `true` and the user is redirected to the main dashboard.

**R1.18** — A partially completed onboarding wizard can be resumed from the same step on re-login. Progress is not lost.

### Organisation & user management (settings)

**R1.19** — An owner or admin can edit their organisation's name, type, location, and room count from `/settings/organisation`.

**R1.20** — An owner or admin can view all users in their organisation, add new users, edit user details (name, phone, role, department), and deactivate users. Deactivated users (`active = false`) cannot log in.

**R1.21** — An owner or admin can view all departments, add new departments from the template library, edit a department's name and report schedule, and deactivate a department.

**R1.22** — An owner or admin can edit a department's form schema via a JSON editor with schema validation. The editor validates the JSONB against the form schema contract before saving. Invalid schemas are rejected with a descriptive error.

**R1.23** — Role-gating: users with `role = 'hod'` or `role = 'staff'` cannot access `/settings/`. Attempting to navigate there redirects them to the dashboard.

### Multi-tenancy validation

**R1.24** — A user from Organisation A cannot read, write, or delete any data belonging to Organisation B. This is verifiable by: logging in as a user from Org A and attempting a direct Supabase API call with Org B's `org_id` — the query must return zero rows or an RLS error.

**R1.25** — The `department_templates` table is readable by all authenticated users (it is not tenant-scoped — it is a global library).

---

## Done when

- [ ] All migration files are in `supabase/migrations/` and apply cleanly to a fresh Supabase project
- [ ] `supabase gen types typescript` produces types with no errors
- [ ] A new organisation can be created end-to-end through the onboarding wizard in under 30 minutes by a first-time user
- [ ] An admin can add, edit, and deactivate users and departments
- [ ] RLS is verified: Org A user cannot access Org B data via direct API calls
- [ ] Authentication (sign-up, login, logout, session persistence, password reset) works on mobile
- [ ] All onboarding wizard steps work on a 375px mobile screen
