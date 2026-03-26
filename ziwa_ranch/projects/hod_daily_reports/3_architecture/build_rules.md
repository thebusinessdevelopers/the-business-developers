# Build Rules

> Principles and standards for building the HOD Daily Reports system. Any AI agent or developer working on this project follows these rules.

---

## Core principles

1. **Simplicity over sophistication.** Every decision defaults to the simpler option. If something can be done without a library, do it without a library.

2. **Functional over polished.** A working form that looks decent beats a beautiful form that's half-built. Get to functional first. Polish is iteration.

3. **Mobile-friendly by default.** Every page and form must be usable on a phone screen. Test at 375px width minimum. But it must also work on desktop — don't break the large screen experience.

4. **Config-driven forms.** All 15 department forms are rendered by a single component reading from a config file. No department gets a custom component. This keeps the codebase simple and makes adding/changing departments trivial.

5. **JSONB for flexibility.** Report data is stored as JSONB, not in rigid columns. This means form changes don't require database migrations. The trade-off (harder to query specific fields) is acceptable — structured querying comes in Phase 4.

6. **No premature abstraction.** Don't build utilities, helpers, or abstractions "for later." Build what the current phase needs. If the next phase needs something different, refactor then.

7. **Test before moving on.** Every phase has a validation gate — a checklist of items that must all pass before moving to the next phase.

---

## Technical standards

### Code

- TypeScript throughout — no `any` types except where genuinely unavoidable
- Tailwind CSS for all styling — no CSS modules, no styled-components, no inline styles
- Components in `/components`, configs in `/config`, Supabase client in `/lib`
- Form config is a single TypeScript file exporting all department form definitions

### Database

- All schema changes via Supabase migrations (not the dashboard UI)
- RLS enabled on all tables — no exceptions
- The `departments` table is seeded with initial data as part of the migration

### Deployment

- Two applications deployed to Netlify:
  - **HOD Portal** — deploys from GitHub repo `thebusinessdevelopers/hod_daily_reports`
  - **Admin Portal** — deployed via Netlify CLI or GitHub connection
- Environment variables on both sites: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`

### Shared code

- The HOD portal and admin portal share form configs, type definitions, and rendering components as copies (not linked packages)
- Changes to shared config (e.g. adding a department form, updating types) must be applied to both projects

---

## Scope boundaries

**If you find yourself doing any of these, stop — it's out of scope for the current build:**

- Building a PWA or adding service workers (connectivity resilience uses browser APIs only)
- Building anything related to WhatsApp integration (Phase 2 — blocked on Meta setup)
- Building AI verification or automated processing (Phase 3)
- Building analytics dashboards or trend analysis (Phase 4)
- Adding email or push notifications
- Creating individual admin user accounts (admin portal uses a single shared password)

---

*Updated: 26 March 2026*
