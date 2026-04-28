import { createHash } from 'node:crypto'
import { buildReportSignature, type SignatureRow } from './analysis-reliability'

export type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const STOCK_DEPT_SLUGS = ['food-and-beverage', 'store', 'kitchen']
const STOCK_WINDOW_DAYS = 7
const STALLED_DAYS_THRESHOLD = 14

export type BookingRow = { id: string; check_in: string; check_out: string; adults: number; children: number; status: string; booking_rooms?: { unit_id: string }[] | null }
export type ReportRow = { report_data: Record<string, unknown> | null; department_id: string; submitted_by: string; ai_flags: { top_label?: string; top_score?: number } | null; hod_departments: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }
export type DeptRow = { id: string; name: string; slug?: string }
export type ActionItemRow = { id: string; title: string; description: string | null; status: string; deadline: string | null; assignee: string | null; updated_at: string; department_id: string | null; hod_departments: { name?: string } | { name?: string }[] | null }
export type HistoricalFlagRow = { ai_flags: { top_label?: string; top_score?: number } | null; report_date: string }
export type VerifiedStockRow = { id: string; department_id: string; stock_type: string; entry_date: string; items: unknown; hod_departments: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }
export type StockFlagRow = { id: string; flag_type: string; item_names: string[] | null; suggested_canonical: string | null; status: string; created_at: string; department_id: string; hod_departments: { name?: string } | { name?: string }[] | null }
export type StockReportRow = { report_data: Record<string, unknown> | null; report_date: string; hod_departments: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }

export interface DailyBriefSignatureContext {
  reportRows: SignatureRow[]
  reports: ReportRow[]
  allDepts: DeptRow[]
  actionItems: ActionItemRow[]
  historicalFlags: HistoricalFlagRow[]
  totalDepts: number
  missingDepts: string[]
  occupancyInput: {
    brief_date: string
    units_total: number
    bookings_brief_date: Array<Record<string, unknown>>
    bookings_next_day: Array<Record<string, unknown>>
  }
  stockInput: {
    brief_date: string
    verified_stock_rows: Array<Record<string, unknown>>
    open_stock_flags: Array<Record<string, unknown>>
    report_extracted_stock_metrics: Array<Record<string, unknown>>
  }
  complianceInput: {
    brief_date: string
    reports: Array<Record<string, unknown>>
    missing_departments: string[]
    active_department_total: number
  }
  actionItemsInput: {
    brief_date: string
    stalled_days_threshold: number
    stalled_cutoff_date: string
    items: Array<Record<string, unknown>>
  }
  subAgentInputs: {
    occupancy: DailyBriefSignatureContext['occupancyInput']
    stock: DailyBriefSignatureContext['stockInput']
    compliance: DailyBriefSignatureContext['complianceInput']
    action_items: DailyBriefSignatureContext['actionItemsInput']
  }
  signatureReports: string
  signature: string
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).sort().join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

export function hashJsonStable(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16)
}

export function buildDailyBriefCacheSignature(
  reportSignature: string,
  operationalInputs: unknown,
): string {
  return `${reportSignature}|${hashJsonStable(operationalInputs)}`
}

export function isDailyBriefCacheFresh(params: {
  cachedSignature: string | undefined
  currentSignature: string
  generatedAt: string | undefined | null
  now?: number
}): boolean {
  if (!params.cachedSignature || !params.generatedAt) return false
  if (params.cachedSignature !== params.currentSignature) return false
  const age = (params.now ?? Date.now()) - new Date(params.generatedAt).getTime()
  return age < TWO_HOURS_MS
}

function nextDateStr(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function getDeptName(dept: { name?: string } | { name?: string }[] | null): string {
  return (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
}

export async function buildDailyBriefSignatureContext(params: {
  supabase: SupabaseLike
  briefDate: string
}): Promise<DailyBriefSignatureContext> {
  const { supabase, briefDate } = params
  const nextDay = nextDateStr(briefDate, 1)
  const stockWindowStart = nextDateStr(briefDate, -(STOCK_WINDOW_DAYS - 1))
  const stalledCutoff = nextDateStr(briefDate, -STALLED_DAYS_THRESHOLD)
  const fourWeeksAgo = nextDateStr(briefDate, -28)

  const { data: reportRowsData } = await supabase
    .from('hod_daily_reports')
    .select('id, edited_at, submitted_at')
    .eq('report_date', briefDate)

  const reportRows = (reportRowsData ?? []) as SignatureRow[]
  if (reportRows.length === 0) {
    return buildEmptyContext(briefDate, reportRows)
  }

  const [
    reportsRes,
    deptsRes,
    todayBookingsRes,
    nextDayBookingsRes,
    unitsRes,
    actionItemsRes,
    historicalFlagsRes,
    verifiedStockRes,
    stockFlagsRes,
    stockReportsRes,
  ] = await Promise.all([
    supabase
      .from('hod_daily_reports')
      .select('report_data, department_id, submitted_by, ai_flags, hod_departments(name, slug)')
      .eq('report_date', briefDate),
    supabase
      .from('hod_departments')
      .select('id, name, slug')
      .eq('is_active', true),
    supabase
      .from('bookings')
      .select('id, check_in, check_out, adults, children, status, booking_rooms(unit_id)')
      .lte('check_in', briefDate)
      .gt('check_out', briefDate)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('id, check_in, check_out, adults, children, status, booking_rooms(unit_id)')
      .lte('check_in', nextDay)
      .gt('check_out', nextDay)
      .neq('status', 'cancelled'),
    supabase
      .from('accommodation_units')
      .select('id')
      .eq('status', 'active'),
    supabase
      .from('hod_meeting_action_items')
      .select('id, title, description, status, deadline, assignee, updated_at, department_id, hod_departments(name)')
      .in('status', ['open', 'in_progress']),
    supabase
      .from('hod_daily_reports')
      .select('ai_flags, report_date')
      .gte('report_date', fourWeeksAgo)
      .lt('report_date', briefDate),
    supabase
      .from('hod_verified_stock')
      .select('id, department_id, stock_type, entry_date, items, hod_departments(name, slug)')
      .gte('entry_date', stockWindowStart)
      .lte('entry_date', briefDate)
      .order('entry_date', { ascending: false }),
    supabase
      .from('hod_stock_flags')
      .select('id, flag_type, item_names, suggested_canonical, status, created_at, department_id, hod_departments(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    supabase
      .from('hod_daily_reports')
      .select('report_data, report_date, hod_departments!inner(name, slug)')
      .in('hod_departments.slug', STOCK_DEPT_SLUGS)
      .gte('report_date', stockWindowStart)
      .lte('report_date', briefDate),
  ])

  const reports = (reportsRes.data ?? []) as ReportRow[]
  const allDepts = (deptsRes.data ?? []) as DeptRow[]
  const todayBookings = (todayBookingsRes.data ?? []) as BookingRow[]
  const nextDayBookings = (nextDayBookingsRes.data ?? []) as BookingRow[]
  const allUnits = (unitsRes.data ?? []) as { id: string }[]
  const actionItems = (actionItemsRes.data ?? []) as ActionItemRow[]
  const historicalFlags = (historicalFlagsRes.data ?? []) as HistoricalFlagRow[]
  const verifiedStock = (verifiedStockRes.data ?? []) as VerifiedStockRow[]
  const stockFlags = (stockFlagsRes.data ?? []) as StockFlagRow[]
  const stockReports = (stockReportsRes.data ?? []) as StockReportRow[]

  const totalDepts = allDepts.length || 16
  const reportedDeptIds = new Set(reports.map((r) => r.department_id))
  const missingDepts = allDepts
    .filter((d) => !reportedDeptIds.has(d.id))
    .map((d) => d.name as string)

  const occupancyInput = {
    brief_date: briefDate,
    units_total: allUnits.length,
    bookings_brief_date: todayBookings.map((b) => ({
      check_in: b.check_in,
      check_out: b.check_out,
      adults: b.adults,
      children: b.children,
      status: b.status,
      unit_ids: (b.booking_rooms ?? []).map((r: { unit_id: string }) => r.unit_id),
    })),
    bookings_next_day: nextDayBookings.map((b) => ({
      check_in: b.check_in,
      check_out: b.check_out,
      adults: b.adults,
      children: b.children,
      status: b.status,
      unit_ids: (b.booking_rooms ?? []).map((r: { unit_id: string }) => r.unit_id),
    })),
  }

  const stockReportExtracts = stockReports
    .map((r) => {
      const data = (r.report_data ?? {}) as Record<string, unknown>
      const stockKeys = Object.entries(data)
        .filter(([key]) => /stock|inventory|closing|opening|received/i.test(key))
        .slice(0, 10)
      if (stockKeys.length === 0) return null
      return {
        report_date: r.report_date,
        department: getDeptName(r.hod_departments),
        stock_fields: Object.fromEntries(stockKeys),
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)

  const stockInput = {
    brief_date: briefDate,
    verified_stock_rows: verifiedStock.map((s) => ({
      stock_type: s.stock_type,
      entry_date: s.entry_date,
      department: getDeptName(s.hod_departments),
      items: s.items,
    })),
    open_stock_flags: stockFlags.map((f) => ({
      flag_type: f.flag_type,
      item_names: f.item_names,
      suggested_canonical: f.suggested_canonical,
      department: getDeptName(f.hod_departments),
      created_at: f.created_at,
    })),
    report_extracted_stock_metrics: stockReportExtracts,
  }

  const complianceInput = {
    brief_date: briefDate,
    reports: reports.map((r) => {
      const flags = r.ai_flags as { top_label?: string; top_score?: number } | null
      const data = (r.report_data ?? {}) as Record<string, unknown>
      return {
        department_name: getDeptName(r.hod_departments),
        submitted_by: r.submitted_by,
        challenges_successes: String(data.challenges_successes ?? '').trim().slice(0, 500),
        urgent_flag: flags?.top_label === 'urgent issue' && (flags?.top_score ?? 0) >= 0.4,
        top_score: flags?.top_score ?? 0,
      }
    }),
    missing_departments: missingDepts,
    active_department_total: totalDepts,
  }

  const actionItemsInput = {
    brief_date: briefDate,
    stalled_days_threshold: STALLED_DAYS_THRESHOLD,
    stalled_cutoff_date: stalledCutoff,
    items: actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      deadline: a.deadline,
      assignee: a.assignee,
      updated_at: a.updated_at,
      department: getDeptName(a.hod_departments),
    })),
  }

  const subAgentInputs = {
    occupancy: occupancyInput,
    stock: stockInput,
    compliance: complianceInput,
    action_items: actionItemsInput,
  }
  const signatureReports = buildReportSignature(reportRows)
  const signature = buildDailyBriefCacheSignature(signatureReports, subAgentInputs)

  return {
    reportRows,
    reports,
    allDepts,
    actionItems,
    historicalFlags,
    totalDepts,
    missingDepts,
    occupancyInput,
    stockInput,
    complianceInput,
    actionItemsInput,
    subAgentInputs,
    signatureReports,
    signature,
  }
}

function buildEmptyContext(briefDate: string, reportRows: SignatureRow[]): DailyBriefSignatureContext {
  const occupancyInput = {
    brief_date: briefDate,
    units_total: 0,
    bookings_brief_date: [],
    bookings_next_day: [],
  }
  const stockInput = {
    brief_date: briefDate,
    verified_stock_rows: [],
    open_stock_flags: [],
    report_extracted_stock_metrics: [],
  }
  const complianceInput = {
    brief_date: briefDate,
    reports: [],
    missing_departments: [],
    active_department_total: 0,
  }
  const actionItemsInput = {
    brief_date: briefDate,
    stalled_days_threshold: STALLED_DAYS_THRESHOLD,
    stalled_cutoff_date: nextDateStr(briefDate, -STALLED_DAYS_THRESHOLD),
    items: [],
  }
  const subAgentInputs = {
    occupancy: occupancyInput,
    stock: stockInput,
    compliance: complianceInput,
    action_items: actionItemsInput,
  }
  const signatureReports = buildReportSignature(reportRows)
  return {
    reportRows,
    reports: [],
    allDepts: [],
    actionItems: [],
    historicalFlags: [],
    totalDepts: 0,
    missingDepts: [],
    occupancyInput,
    stockInput,
    complianceInput,
    actionItemsInput,
    subAgentInputs,
    signatureReports,
    signature: buildDailyBriefCacheSignature(signatureReports, subAgentInputs),
  }
}
