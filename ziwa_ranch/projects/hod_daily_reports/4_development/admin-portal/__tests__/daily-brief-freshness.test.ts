import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDailyBriefSignatureContext,
  buildDailyBriefCacheSignature,
  isDailyBriefCacheFresh,
} from '../lib/daily-brief-freshness'

function stubSupabaseBySelect(resolver: (table: string, selected: string) => unknown[]) {
  return {
    from: (table: string) => {
      let selected = ''
      const builder: Record<string, unknown> = {}
      const chain = (): typeof builder => builder
      for (const method of ['eq', 'neq', 'lte', 'lt', 'gte', 'gt', 'in', 'order']) {
        builder[method] = chain
      }
      builder.select = (value: string) => {
        selected = value
        return builder
      }
      builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) => {
        resolve({ data: resolver(table, selected), error: null })
        return builder
      }
      return builder
    },
  }
}

test('buildDailyBriefCacheSignature includes report rows and operational input hash', () => {
  const sig = buildDailyBriefCacheSignature('r1:2026|r2:2026', { occupancy: { units: 10 } })
  assert.ok(sig.startsWith('r1:2026|r2:2026|'), `Signature should start with report part: ${sig}`)
  assert.ok(sig.length > 'r1:2026|r2:2026|'.length, 'Signature should include hash after report part')
})

test('buildDailyBriefCacheSignature changes when operational inputs change without report edits', () => {
  const reports = 'r1:2026-04-22T10:00:00Z'
  const sig1 = buildDailyBriefCacheSignature(reports, { occupancy: { units: 10 } })
  const sig2 = buildDailyBriefCacheSignature(reports, { occupancy: { units: 11 } })
  assert.notEqual(sig1, sig2, 'Signatures must differ when operational inputs differ')
})

test('buildDailyBriefSignatureContext keeps signature stable when operational rows arrive in different order', async () => {
  const briefDate = '2026-04-22'
  const reportRows = [
    { id: 'r2', edited_at: null, submitted_at: '2026-04-22T11:00:00Z' },
    { id: 'r1', edited_at: null, submitted_at: '2026-04-22T10:00:00Z' },
  ]
  const reports = [
    { report_data: { challenges_successes: 'All fine' }, department_id: 'd2', submitted_by: 'u2', ai_flags: null, hod_departments: { name: 'Kitchen', slug: 'kitchen' } },
    { report_data: { challenges_successes: 'Quiet day' }, department_id: 'd1', submitted_by: 'u1', ai_flags: null, hod_departments: { name: 'Reception', slug: 'reception' } },
  ]
  const depts = [
    { id: 'd3', name: 'Workshop', slug: 'workshop' },
    { id: 'd1', name: 'Reception', slug: 'reception' },
    { id: 'd2', name: 'Kitchen', slug: 'kitchen' },
  ]
  const bookings = [
    { id: 'b2', check_in: briefDate, check_out: '2026-04-23', adults: 1, children: 0, status: 'confirmed', booking_rooms: [{ unit_id: 'u2' }, { unit_id: 'u1' }] },
    { id: 'b1', check_in: briefDate, check_out: '2026-04-23', adults: 2, children: 1, status: 'confirmed', booking_rooms: [{ unit_id: 'u3' }] },
  ]
  const actionItems = [
    { id: 'a2', title: 'Check pump', description: null, status: 'open', deadline: null, assignee: null, updated_at: '2026-04-20T10:00:00Z', department_id: 'd3', hod_departments: { name: 'Workshop' } },
    { id: 'a1', title: 'Order flour', description: null, status: 'open', deadline: '2026-04-25', assignee: null, updated_at: '2026-04-21T10:00:00Z', department_id: 'd2', hod_departments: { name: 'Kitchen' } },
  ]
  const stockRows = [
    { id: 's2', department_id: 'd2', stock_type: 'dry goods', entry_date: briefDate, items: [{ name: 'Rice' }], hod_departments: { name: 'Kitchen', slug: 'kitchen' } },
    { id: 's1', department_id: 'd3', stock_type: 'fuel', entry_date: briefDate, items: [{ name: 'Diesel' }], hod_departments: { name: 'Workshop', slug: 'workshop' } },
  ]
  const stockFlags = [
    { id: 'f2', flag_type: 'low_stock', item_names: ['Rice'], suggested_canonical: null, status: 'open', created_at: '2026-04-22T08:00:00Z', department_id: 'd2', hod_departments: { name: 'Kitchen' } },
    { id: 'f1', flag_type: 'critical', item_names: ['Diesel'], suggested_canonical: null, status: 'open', created_at: '2026-04-22T07:00:00Z', department_id: 'd3', hod_departments: { name: 'Workshop' } },
  ]
  const stockReports = [
    { report_data: { stock_count: 2, opening: 5 }, report_date: briefDate, hod_departments: { name: 'Kitchen', slug: 'kitchen' } },
    { report_data: { inventory_note: 'Diesel low' }, report_date: briefDate, hod_departments: { name: 'Workshop', slug: 'workshop' } },
  ]

  const makeSupabase = (reverse: boolean) => stubSupabaseBySelect((table, selected) => {
    const maybeReverse = <T>(rows: T[]) => reverse ? [...rows].reverse() : rows
    if (table === 'hod_daily_reports' && selected === 'id, edited_at, submitted_at') return maybeReverse(reportRows)
    if (table === 'hod_daily_reports' && selected.startsWith('report_data, department_id')) return maybeReverse(reports)
    if (table === 'hod_daily_reports' && selected === 'ai_flags, report_date') return []
    if (table === 'hod_daily_reports' && selected.startsWith('report_data, report_date')) return maybeReverse(stockReports)
    if (table === 'hod_departments') return maybeReverse(depts)
    if (table === 'bookings') return maybeReverse(bookings)
    if (table === 'accommodation_units') return [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]
    if (table === 'hod_meeting_action_items') return maybeReverse(actionItems)
    if (table === 'hod_verified_stock') return maybeReverse(stockRows)
    if (table === 'hod_stock_flags') return maybeReverse(stockFlags)
    return []
  })

  const first = await buildDailyBriefSignatureContext({
    supabase: makeSupabase(false),
    briefDate,
  })
  const second = await buildDailyBriefSignatureContext({
    supabase: makeSupabase(true),
    briefDate,
  })

  assert.equal(first.signature, second.signature)
})

test('isDailyBriefCacheFresh accepts recent matching composite signature', () => {
  const sig = buildDailyBriefCacheSignature('r1:x', { a: 1 })
  const result = isDailyBriefCacheFresh({
    cachedSignature: sig,
    currentSignature: sig,
    generatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  })
  assert.equal(result, true)
})

test('isDailyBriefCacheFresh rejects changed operational inputs', () => {
  const cached = buildDailyBriefCacheSignature('r1:x', { a: 1 })
  const current = buildDailyBriefCacheSignature('r1:x', { a: 2 })
  const result = isDailyBriefCacheFresh({
    cachedSignature: cached,
    currentSignature: current,
    generatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  })
  assert.equal(result, false)
})

test('isDailyBriefCacheFresh rejects cache older than two hours', () => {
  const sig = buildDailyBriefCacheSignature('r1:x', { a: 1 })
  const result = isDailyBriefCacheFresh({
    cachedSignature: sig,
    currentSignature: sig,
    generatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  })
  assert.equal(result, false)
})
