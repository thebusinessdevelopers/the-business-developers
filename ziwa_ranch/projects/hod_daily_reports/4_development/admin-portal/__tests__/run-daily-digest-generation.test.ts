import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { runDailyDigestGeneration } from '../lib/daily-digest-generation'

const origFetch = globalThis.fetch
const origKey = process.env.OPENROUTER_API_KEY
const origModel = process.env.OPENROUTER_MODEL
const origModelFast = process.env.OPENROUTER_MODEL_FAST

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5'
  process.env.OPENROUTER_MODEL_FAST = 'google/gemini-2.5-flash'
})

afterEach(() => {
  globalThis.fetch = origFetch
  process.env.OPENROUTER_API_KEY = origKey
  process.env.OPENROUTER_MODEL = origModel
  process.env.OPENROUTER_MODEL_FAST = origModelFast
})

// Minimal Supabase query-builder stub supporting the call shapes used by
// runDailyDigestGeneration. Each .from('table') returns a fresh thenable
// that resolves to { data } for the given table; the method chain is a
// no-op that always resolves to the same row set.
function stubSupabase(rows: Record<string, unknown[]>) {
  const selectReturn = (table: string) => {
    const data = rows[table] ?? []
    const builder: Record<string, unknown> = {}
    const chain = (): typeof builder => builder
    for (const m of [
      'select', 'eq', 'neq', 'lte', 'lt', 'gte', 'gt', 'in',
      'order', 'maybeSingle', 'limit', 'upsert', 'delete',
    ]) {
      builder[m] = chain
    }
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => void) => {
      resolve({ data, error: null })
      return builder
    }
    return builder
  }
  return { from: (table: string) => selectReturn(table) }
}

function stubFetchRouter(responses: { match: (body: string) => boolean; body: unknown }[]) {
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const bodyStr = typeof init?.body === 'string' ? init.body : ''
    const hit = responses.find((r) => r.match(bodyStr))
    if (!hit) {
      return new Response('{"choices":[{"message":{"content":""}}]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(hit.body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

test('successful multi-agent run → status=generated, degraded=false, correct models', async () => {
  const briefDate = '2026-04-22'
  const supabase = stubSupabase({
    hod_daily_reports: [
      { id: 'r1', edited_at: null, submitted_at: '2026-04-22T10:00:00Z', report_data: { challenges_successes: 'All fine' }, department_id: 'd1', submitted_by: 'u1', ai_flags: null, hod_departments: { name: 'Reception', slug: 'reception' } },
    ],
    hod_departments: [
      { id: 'd1', name: 'Reception', slug: 'reception', is_active: true },
      { id: 'd2', name: 'Kitchen', slug: 'kitchen', is_active: true },
    ],
    bookings: [],
    accommodation_units: [{ id: 'u1' }],
    hod_meeting_action_items: [],
    hod_verified_stock: [],
    hod_stock_flags: [],
    hod_analysis_cache: [],
  })

  const subAgentJson = JSON.stringify({
    brief_date: briefDate,
    units_total: 1,
    anomalies: [],
  })
  const orchestratorText = [
    'OVERVIEW',
    '1 of 2 departments reported today.',
    '',
    'HIGHLIGHTS',
    'Reception — all fine.',
    '',
    'ACTION ITEMS',
    'No actions required.',
    '',
    'NOT YET REPORTED',
    'Kitchen',
  ].join('\n')

  stubFetchRouter([
    {
      match: (body) => body.includes('"model":"google/gemini-2.5-flash"'),
      body: { choices: [{ message: { content: subAgentJson }, finish_reason: 'stop' }], usage: {} },
    },
    {
      match: (body) => body.includes('"model":"anthropic/claude-sonnet-4.5"'),
      body: { choices: [{ message: { content: orchestratorText }, finish_reason: 'stop' }], usage: {} },
    },
  ])

  const result = await runDailyDigestGeneration({
    supabase: supabase as unknown as Parameters<typeof runDailyDigestGeneration>[0]['supabase'],
    briefDate,
    force: true,
  })

  assert.equal(result.status, 'generated')
  assert.equal(result.data?.degraded ?? false, false)
  assert.equal(result.data?.pipeline_version, 'v2.12-multi-agent')
  assert.ok(result.data?.sub_agent_models?.includes('google/gemini-2.5-flash'))
  assert.ok((result.data?.orchestrator_model ?? '').includes('claude-sonnet-4.5'))
  assert.ok((result.data?.digest ?? '').includes('OVERVIEW'))
})

test('429 rate_limit on sub-agents → degraded_reason includes category', async () => {
  const briefDate = '2026-04-22'
  const supabase = stubSupabase({
    hod_daily_reports: [
      { id: 'r1', edited_at: null, submitted_at: '2026-04-22T10:00:00Z', report_data: {}, department_id: 'd1', submitted_by: 'u1', ai_flags: null, hod_departments: { name: 'Reception', slug: 'reception' } },
    ],
    hod_departments: [{ id: 'd1', name: 'Reception', slug: 'reception', is_active: true }],
    bookings: [],
    accommodation_units: [],
    hod_meeting_action_items: [],
    hod_verified_stock: [],
    hod_stock_flags: [],
    hod_analysis_cache: [],
  })

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const bodyStr = typeof init?.body === 'string' ? init.body : ''
    if (bodyStr.includes('"model":"google/gemini-2.5-flash"')) {
      return new Response('Too many requests', { status: 429 })
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'OVERVIEW\nx\n\nHIGHLIGHTS\ny\n\nACTION ITEMS\nz\n\nNOT YET REPORTED\nw' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  }) as typeof fetch

  const result = await runDailyDigestGeneration({
    supabase: supabase as unknown as Parameters<typeof runDailyDigestGeneration>[0]['supabase'],
    briefDate,
    force: true,
  })

  assert.equal(result.status, 'generated')
  assert.equal(result.data?.degraded, true)
  assert.match(result.data?.degraded_reason ?? '', /rate_limit/)
})
