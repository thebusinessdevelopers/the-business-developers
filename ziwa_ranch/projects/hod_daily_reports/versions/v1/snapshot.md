# HOD Daily Reports — Version 1 Snapshot

> **Purpose:** A complete, self-contained record of Version 1. Everything here is sufficient to recreate the system from zero — from an empty machine to a fully live, functional portal.
>
> **Frozen on:** 14 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)

---

## What Version 1 is

A web portal for Ziwa Ranch's 13 departments. Each head of department (HOD) visits the URL, taps their department, fills in their daily form, and submits. Reports are stored in Supabase. No login required to submit.

**What it deliberately does NOT include:**
- User authentication
- Dashboard or reporting views
- Notifications (email, WhatsApp, push)
- Offline support
- Edit or delete of submitted reports
- IT department form (pending Benson's template)

---

## Architecture

```
[HOD on phone/computer] → [Next.js on Netlify] → [Supabase database]
```

- No backend server. The Supabase JS client calls the database directly from the browser.
- Forms are config-driven. One `FormRenderer` component handles all 12 departments.
- Adding a new department = adding one config entry to `forms.ts` + enabling it in the DB.
- Report data is stored as JSONB — each department's form produces a different shape, no schema changes needed when forms change.

---

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI library | React | 19.2.3 |
| Styling | Tailwind CSS | v4 |
| Database | Supabase (PostgreSQL) | Hosted |
| Hosting | Netlify | Free tier |
| Language | TypeScript | ^5 |

---

## Services and credentials

| Service | Detail |
|---|---|
| Supabase project ID | `inidzwfjnkyinxhvbrdt` |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaWR6d2Zqbmt5aW54aHZicmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYyODEsImV4cCI6MjA4ODM0MjI4MX0.SdrtofCN11YoqxpmiV0_SQ-exSKzCW2m19UxMSyd30M` |
| GitHub repo | `https://github.com/thebusinessdevelopers/hod_daily_reports` |
| Netlify project ID | `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303` |
| Live URL | `https://hoddailyreports.netlify.app` |

**Environment variables (required to run the app):**
```
NEXT_PUBLIC_SUPABASE_URL=https://inidzwfjnkyinxhvbrdt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaWR6d2Zqbmt5aW54aHZicmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYyODEsImV4cCI6MjA4ODM0MjI4MX0.SdrtofCN11YoqxpmiV0_SQ-exSKzCW2m19UxMSyd30M
```

---

## Database schema

Run this SQL in its entirety on the Supabase project to recreate the database from zero:

```sql
-- HOD Daily Reports — Initial Schema
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- Departments
create table if not exists hod_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  hods text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Daily reports (one row per submission)
create table if not exists hod_daily_reports (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  submitted_by text not null,
  report_date date not null default current_date,
  submitted_at timestamptz not null default now(),
  report_data jsonb not null default '{}'
);

-- Indexes
create index if not exists hod_daily_reports_department_id_idx on hod_daily_reports(department_id);
create index if not exists hod_daily_reports_report_date_idx on hod_daily_reports(report_date);
create index if not exists hod_daily_reports_submitted_by_idx on hod_daily_reports(submitted_by);

-- RLS
alter table hod_departments enable row level security;
alter table hod_daily_reports enable row level security;

-- Departments: anyone can read
create policy "Public can read departments"
  on hod_departments for select
  using (true);

-- Daily reports: anyone can insert (no login required)
create policy "Anyone can submit a report"
  on hod_daily_reports for insert
  with check (true);

-- Daily reports: only authenticated users can read
create policy "Authenticated users can read reports"
  on hod_daily_reports for select
  using (auth.role() = 'authenticated');

-- Seed: 12 active departments + IT (coming soon)
insert into hod_departments (name, slug, hods, sort_order, is_active) values
  ('Main Gate',          'main-gate',          array['Jjuko'],           1,  true),
  ('HQ Reception',       'hq-reception',       array['Emilly'],          2,  true),
  ('Food & Beverage',    'food-and-beverage',  array['Howard'],          3,  true),
  ('Kitchen',            'kitchen',            array['Sensio'],          4,  true),
  ('Housekeeping',       'housekeeping',       array['Elly'],            5,  true),
  ('Security',           'security',           array['Salim'],           6,  true),
  ('Store',              'store',              array['Denis'],           7,  true),
  ('Finance',            'finance',            array['Musoni'],          8,  true),
  ('Electrical',         'electrical',         array['Robert'],          9,  true),
  ('HQ Maintenance',     'hq-maintenance',     array['David'],           10, true),
  ('Vehicle Maintenance','vehicle-maintenance', array['Kanja', 'Roger'], 11, true),
  ('Plumbing',           'plumbing',           array['Richard'],         12, true),
  ('IT',                 'it',                 array['Benson'],          13, false)
on conflict (slug) do nothing;
```

---

## File structure

```
portal/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                        ← Landing page (department selector)
│   └── report/
│       └── [slug]/
│           ├── page.tsx                ← Server component: loads dept + form config
│           └── ReportForm.tsx          ← Client component: success state wrapper
├── components/
│   ├── FormRenderer.tsx                ← Core form logic: renders all field types
│   └── RepeaterField.tsx               ← Dynamic repeating row input
├── config/
│   └── forms.ts                        ← All 12 department form definitions
├── lib/
│   └── supabase.ts                     ← Supabase client initialisation
├── supabase/
│   └── migrations/
│       └── 001_hod_reports_schema.sql  ← DB schema (already applied)
├── types/
│   └── index.ts                        ← TypeScript types for all data shapes
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Source code

### `package.json`

```json
{
  "name": "portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.99.1",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

### `types/index.ts`

```typescript
export type FieldType = 'text' | 'textarea' | 'number' | 'repeater' | 'checkbox_group' | 'select'

export interface SubField {
  name: string
  label: string
  type: 'text' | 'number' | 'textarea'
  placeholder?: string
}

export interface FormField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: string[]
  sub_fields?: SubField[]
  min_rows?: number
}

export interface FormSection {
  title: string
  fields: FormField[]
}

export interface DepartmentFormConfig {
  slug: string
  name: string
  hods: string[]
  sections: FormSection[]
}

export interface Department {
  id: string
  name: string
  slug: string
  hods: string[]
  sort_order: number
  is_active: boolean
}

export interface DailyReport {
  id: string
  department_id: string
  submitted_by: string
  report_date: string
  submitted_at: string
  report_data: Record<string, unknown>
}
```

---

### `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #f9fafb;
  --foreground: #111827;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

---

### `app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ziwa Ranch — Daily Reports',
  description: 'HOD daily report submission portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
```

---

### `app/page.tsx`

```typescript
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Department } from '@/types'

async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('hod_departments')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to load departments:', error)
    return []
  }
  return data ?? []
}

export default async function HomePage() {
  const departments = await getDepartments()
  const activeDepartments = departments.filter((d) => d.is_active)
  const inactiveDepartments = departments.filter((d) => !d.is_active)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">ZR</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Ziwa Ranch</h1>
              <p className="text-sm text-gray-500">Daily Report Portal</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Select your department</h2>
          <p className="text-sm text-gray-500">Choose your department to open today&apos;s report form.</p>
        </div>

        {departments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Unable to load departments. Please refresh the page.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeDepartments.map((dept) => (
                <Link
                  key={dept.id}
                  href={`/report/${dept.slug}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-green-400 hover:shadow-sm transition-all group"
                >
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {dept.hods.join(' & ')}
                    </p>
                  </div>
                  <span className="text-gray-300 group-hover:text-green-500 transition-colors text-lg">→</span>
                </Link>
              ))}
            </div>

            {inactiveDepartments.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Coming soon</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {inactiveDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 opacity-50 cursor-not-allowed"
                    >
                      <div>
                        <p className="font-semibold text-gray-500">{dept.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dept.hods.join(' & ')}</p>
                      </div>
                      <span className="text-xs text-gray-300">Soon</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-300 mt-10">
          Ziwa Ranch · Daily Reporting System
        </p>
      </div>
    </main>
  )
}
```

---

### `app/report/[slug]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getFormBySlug } from '@/config/forms'
import { Department } from '@/types'
import ReportForm from './ReportForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  const { data, error } = await supabase
    .from('hod_departments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const [department, formConfig] = await Promise.all([
    getDepartmentBySlug(slug),
    Promise.resolve(getFormBySlug(slug)),
  ])

  if (!department || !formConfig) {
    notFound()
  }

  if (!department.is_active) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Back</Link>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">This department&apos;s report form is coming soon.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-green-700 hover:underline">Back to departments</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>←</span> Departments
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">ZR</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Daily Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in today&apos;s report and submit when complete.</p>
        </div>

        <ReportForm config={formConfig} departmentId={department.id} />
      </div>
    </main>
  )
}
```

---

### `app/report/[slug]/ReportForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'

interface ReportFormProps {
  config: DepartmentFormConfig
  departmentId: string
}

export default function ReportForm({ config, departmentId }: ReportFormProps) {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report submitted</h2>
        <p className="text-sm text-gray-500">
          Your {config.name} report has been saved successfully.
        </p>
        <div className="flex flex-col gap-3 items-center mt-6">
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm text-green-700 font-medium hover:text-green-900 border border-green-300 rounded-lg px-5 py-2.5 hover:bg-green-50 transition-colors"
          >
            Submit another report
          </button>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to departments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <FormRenderer
      config={config}
      departmentId={departmentId}
      onSuccess={() => setSubmitted(true)}
    />
  )
}
```

---

### `components/FormRenderer.tsx`

```typescript
'use client'

import { useState } from 'react'
import { DepartmentFormConfig, FormField } from '@/types'
import RepeaterField from './RepeaterField'

interface FormRendererProps {
  config: DepartmentFormConfig
  departmentId: string
  onSuccess: () => void
}

type FormValues = Record<string, unknown>

export default function FormRenderer({ config, departmentId, onSuccess }: FormRendererProps) {
  const today = new Date().toISOString().split('T')[0]

  const [submittedBy, setSubmittedBy] = useState(config.hods.length === 1 ? config.hods[0] : '')
  const [reportDate, setReportDate] = useState(today)
  const [values, setValues] = useState<FormValues>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  function validate(): string | null {
    if (!submittedBy) return 'Please select your name.'
    if (!reportDate) return 'Please select a report date.'

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (field.required) {
          const val = values[field.name]
          if (val === undefined || val === null || val === '') {
            return `"${field.label}" is required.`
          }
        }
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { error: dbError } = await supabase.from('hod_daily_reports').insert({
        department_id: departmentId,
        submitted_by: submittedBy,
        report_date: reportDate,
        report_data: values,
      })

      if (dbError) throw dbError
      onSuccess()
    } catch (err) {
      console.error(err)
      setError('Something went wrong submitting the report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function renderField(field: FormField) {
    if (field.type === 'repeater') {
      const rows = (values[field.name] as Record<string, string | number>[]) ?? []
      return (
        <RepeaterField
          key={field.name}
          fieldName={field.name}
          label={field.label}
          subFields={field.sub_fields ?? []}
          minRows={field.min_rows ?? 0}
          value={rows}
          onChange={(updated) => setValue(field.name, updated)}
        />
      )
    }

    const baseClass =
      'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'

    return (
      <div key={field.name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'textarea' && (
          <textarea
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className={baseClass}
          />
        )}

        {field.type === 'number' && (
          <input
            type="number"
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            min={0}
            className={baseClass}
          />
        )}

        {field.type === 'text' && (
          <input
            type="text"
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseClass}
          />
        )}

        {field.type === 'select' && (
          <select
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            required={field.required}
            className={baseClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Your name <span className="text-red-500">*</span>
          </label>
          {config.hods.length === 1 ? (
            <p className="text-sm text-gray-800 font-medium py-2">{config.hods[0]}</p>
          ) : (
            <select
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select your name...</option>
              {config.hods.map((hod) => (
                <option key={hod} value={hod}>{hod}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Report date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            required
            max={today}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {config.sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.fields.map((field) => renderField(field))}
          </div>
        </div>
      ))}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  )
}
```

---

### `components/RepeaterField.tsx`

```typescript
'use client'

import { SubField } from '@/types'

interface RepeaterRow {
  [key: string]: string | number
}

interface RepeaterFieldProps {
  fieldName: string
  label: string
  subFields: SubField[]
  minRows: number
  value: RepeaterRow[]
  onChange: (rows: RepeaterRow[]) => void
}

export default function RepeaterField({
  fieldName,
  label,
  subFields,
  minRows,
  value,
  onChange,
}: RepeaterFieldProps) {
  const rows = value.length > 0 ? value : minRows > 0 ? Array.from({ length: minRows }, () => emptyRow(subFields)) : []

  function emptyRow(fields: SubField[]): RepeaterRow {
    return Object.fromEntries(fields.map((f) => [f.name, '']))
  }

  function updateRow(index: number, field: string, val: string) {
    const updated = rows.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    onChange(updated)
  }

  function addRow() {
    onChange([...rows, emptyRow(subFields)])
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {rows.length === 0 && (
        <p className="text-sm text-gray-400 italic">No entries yet. Add one below.</p>
      )}

      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Entry {rowIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRow(rowIndex)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>

          {subFields.map((sub) => (
            <div key={sub.name}>
              <label className="block text-xs text-gray-600 mb-1">{sub.label}</label>
              {sub.type === 'textarea' ? (
                <textarea
                  name={`${fieldName}[${rowIndex}][${sub.name}]`}
                  value={String(row[sub.name] ?? '')}
                  onChange={(e) => updateRow(rowIndex, sub.name, e.target.value)}
                  placeholder={sub.placeholder}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                />
              ) : (
                <input
                  type={sub.type === 'number' ? 'number' : 'text'}
                  name={`${fieldName}[${rowIndex}][${sub.name}]`}
                  value={String(row[sub.name] ?? '')}
                  onChange={(e) => updateRow(rowIndex, sub.name, e.target.value)}
                  placeholder={sub.placeholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium hover:text-green-900 border border-green-300 rounded-md px-3 py-1.5 hover:bg-green-50 transition-colors"
      >
        <span>+</span> Add entry
      </button>
    </div>
  )
}
```

---

### `config/forms.ts`

See the live file at `4_development/portal/config/forms.ts` — it is the canonical source and is too long to duplicate here. The file defines `DEPARTMENT_FORMS`, an array of `DepartmentFormConfig` objects, one per department. Each entry follows this shape:

```typescript
{
  slug: 'department-slug',
  name: 'Department Name',
  hods: ['HOD Name'],
  sections: [
    {
      title: 'Section Title',
      fields: [
        { name: 'field_name', label: 'Field Label', type: 'text|textarea|number|repeater', required: true }
      ]
    }
  ]
}
```

Departments covered: Main Gate, HQ Reception, Food & Beverage, Kitchen, Housekeeping, Security, Store, Finance, Electrical, HQ Maintenance, Vehicle Maintenance, Plumbing.

---

## Recreating from zero — step by step

1. **Create a new Next.js project**
   ```bash
   npx create-next-app@16.1.6 portal --typescript --tailwind --app --no-src-dir --import-alias "@/*"
   cd portal
   npm install @supabase/supabase-js
   ```

2. **Replace generated files** with the source code above, file by file.

3. **Create a `.env.local`** at the project root with the two environment variables listed above.

4. **Run the database schema** — paste the full SQL block above into the Supabase SQL editor and execute.

5. **Test locally**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`. All 12 departments should load. Submit a test report and verify it appears in Supabase.

6. **Deploy**
   - Push to a GitHub repo
   - Connect to Netlify (or any Next.js-compatible host)
   - Add the two environment variables in the hosting platform's settings
   - Deploy

---

*Snapshot frozen: 14 March 2026. Version 1 is live and in active use.*
