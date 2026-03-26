# Phase 1 — Tech Stack & Services

---

## Services

| Service | What it does | Cost | Account status |
|---|---|---|---|
| **Supabase** | Database (PostgreSQL), authentication (future), API | Free tier (sufficient) | Already active — shared project `inidzwfjnkyinxhvbrdt` |
| **Vercel** | Hosts the Next.js frontend | Free tier (sufficient) | Needs account setup |
| **GitHub** | Source code repository | Free | Needs repo creation |

## Frontend stack

| Technology | Why |
|---|---|
| **Next.js 14+ (App Router)** | Well-supported by AI coding tools, first-class Supabase integration, handles both static and dynamic rendering |
| **TypeScript** | Catches errors early, better AI code generation |
| **Tailwind CSS** | Fast styling, responsive out of the box, works well with AI generation |
| **@supabase/supabase-js** | Official Supabase client — handles all database operations from the browser |

## Database

| Technology | Why |
|---|---|
| **Supabase (PostgreSQL)** | Already in use at Ziwa, JSONB support for flexible form data, RLS for security, free tier is generous |

## Development tools

| Tool | Purpose |
|---|---|
| **Cursor** | AI-assisted development (primary IDE) |
| **Vercel CLI** | Deploy from command line |
| **Supabase CLI** | Database migrations |

## Accounts to set up before building

1. **Vercel** — sign up at vercel.com (free, use GitHub login)
2. **GitHub repo** — create `ziwa-hod-reports` repository
3. **Supabase** — already exists, just need to add new tables to the existing project

## Not needed for Phase 1

- Meta Business account (Phase 2)
- Twilio / WhatsApp Business API (Phase 2)
- Anthropic API / AI model access (Phase 3)
- Custom domain (nice-to-have, not required — Vercel provides a `.vercel.app` subdomain)
