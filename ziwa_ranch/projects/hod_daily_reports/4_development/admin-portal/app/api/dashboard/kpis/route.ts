import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { getKampalaDateStr, getSubmissionStatus } from '@/lib/submission-status'

type PeriodKey = 'week' | 'month' | 'quarter' | 'year'

interface PeriodDates {
  currentStart: string
  currentEnd: string
  priorStart: string
  priorEnd: string
  label: string
}

interface CardData {
  title: string
  value: string
  subtitle: string
  trend: 'up' | 'down' | 'flat'
  trendIsPositive: boolean
  href?: string
}

interface PillarData {
  id: string
  label: string
  href: string
  cards: CardData[]
}

const VALID_PERIODS = new Set<PeriodKey>(['week', 'month', 'quarter', 'year'])

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

function computePeriodDates(period: PeriodKey, today: string): PeriodDates {
  const d = new Date(today + 'T12:00:00Z')
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()

  switch (period) {
    case 'week': {
      const start = new Date(d)
      start.setUTCDate(day - 6)
      const priorEnd = new Date(d)
      priorEnd.setUTCDate(day - 7)
      const priorStart = new Date(d)
      priorStart.setUTCDate(day - 13)

      return {
        currentStart: fmt(start),
        currentEnd: today,
        priorStart: fmt(priorStart),
        priorEnd: fmt(priorEnd),
        label: 'vs prior 7 days',
      }
    }

    case 'month': {
      const start = new Date(d)
      start.setUTCDate(day - 29)
      const priorEnd = new Date(d)
      priorEnd.setUTCDate(day - 30)
      const priorStart = new Date(d)
      priorStart.setUTCDate(day - 59)

      return {
        currentStart: fmt(start),
        currentEnd: today,
        priorStart: fmt(priorStart),
        priorEnd: fmt(priorEnd),
        label: 'vs prior 30 days',
      }
    }

    case 'quarter': {
      const qMonth = Math.floor(month / 3) * 3
      const qStart = new Date(Date.UTC(year, qMonth, 1, 12))
      const currentStart = fmt(qStart)

      const pqStart = new Date(Date.UTC(year, qMonth - 3, 1, 12))
      const priorStart = fmt(pqStart)
      const dayOffset = Math.floor((d.getTime() - qStart.getTime()) / 86_400_000)
      const priorEnd = new Date(pqStart)
      priorEnd.setUTCDate(priorEnd.getUTCDate() + dayOffset)

      return { currentStart, currentEnd: today, priorStart, priorEnd: fmt(priorEnd), label: 'vs last quarter' }
    }

    case 'year': {
      const currentStart = `${year}-01-01`
      const priorStart = `${year - 1}-01-01`
      const daysInPriorMonth = new Date(Date.UTC(year - 1, month + 1, 0)).getUTCDate()
      const priorEndDate = new Date(Date.UTC(year - 1, month, Math.min(day, daysInPriorMonth), 12))

      return { currentStart, currentEnd: today, priorStart, priorEnd: fmt(priorEndDate), label: 'vs last year' }
    }
  }
}

function priorEquivalentDay(period: PeriodKey, today: string): string {
  const d = new Date(today + 'T12:00:00Z')
  switch (period) {
    case 'week': d.setUTCDate(d.getUTCDate() - 7); break
    case 'month': d.setUTCDate(d.getUTCDate() - 30); break
    case 'quarter': d.setUTCMonth(d.getUTCMonth() - 3); break
    case 'year': d.setUTCFullYear(d.getUTCFullYear() - 1); break
  }
  return fmt(d)
}

function trend(current: number, prior: number): 'up' | 'down' | 'flat' {
  if (current > prior) return 'up'
  if (current < prior) return 'down'
  return 'flat'
}

function formatNum(n: number): string {
  return n.toLocaleString('en-GB')
}

function formatUGX(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}UGX ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}UGX ${Math.round(abs / 1_000)}K`
  return `UGX ${formatNum(n)}`
}

function formatUSD(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${formatNum(Math.round(abs))}`
}

// ── Operations ──────────────────────────────────────────────

async function fetchOperations(dates: PeriodDates): Promise<PillarData> {
  const supabase = createServerClient()

  const [currentRes, priorRes] = await Promise.all([
    supabase
      .from('hod_daily_reports')
      .select('department_id, submitted_at, report_date, ai_flags')
      .gte('report_date', dates.currentStart)
      .lte('report_date', dates.currentEnd),
    supabase
      .from('hod_daily_reports')
      .select('department_id, submitted_at, report_date, ai_flags')
      .gte('report_date', dates.priorStart)
      .lte('report_date', dates.priorEnd),
  ])

  function dedupe(rows: typeof currentRes.data): NonNullable<typeof currentRes.data> {
    const seen = new Set<string>()
    const result: NonNullable<typeof currentRes.data> = []
    for (const r of rows ?? []) {
      const key = `${r.department_id}:${r.report_date}`
      if (!seen.has(key)) { seen.add(key); result.push(r) }
    }
    return result
  }

  function classify(rows: typeof currentRes.data) {
    const deduped = dedupe(rows)
    let total = 0, late = 0, warnings = 0, urgent = 0
    for (const r of deduped) {
      total++
      if (r.submitted_at && r.report_date) {
        const status = getSubmissionStatus(r.submitted_at, r.report_date)
        if (status === 'late') late++
        else if (status === 'warning') warnings++
      }
      const flags = r.ai_flags as Record<string, unknown> | null
      if (flags?.top_label === 'urgent issue' && Number(flags?.top_score ?? 0) >= 0.4) urgent++
    }
    return { total, late, warnings, urgent }
  }

  const cur = classify(currentRes.data)
  const pri = classify(priorRes.data)

  return {
    id: 'operations',
    label: 'Operations',
    href: '/operations',
    cards: [
      {
        title: 'Reports submitted',
        value: formatNum(cur.total),
        subtitle: pri.total ? `${dates.label} (${formatNum(pri.total)})` : 'no prior data',
        trend: trend(cur.total, pri.total),
        trendIsPositive: true,
      },
      {
        title: 'Late submissions',
        value: formatNum(cur.late),
        subtitle: pri.total ? `${dates.label} (${formatNum(pri.late)})` : 'no prior data',
        trend: trend(cur.late, pri.late),
        trendIsPositive: false,
      },
      {
        title: 'Warnings',
        value: formatNum(cur.warnings),
        subtitle: pri.total ? `${dates.label} (${formatNum(pri.warnings)})` : 'no prior data',
        trend: trend(cur.warnings, pri.warnings),
        trendIsPositive: false,
      },
      {
        title: 'Urgent flags',
        value: formatNum(cur.urgent),
        subtitle: pri.total ? `${dates.label} (${formatNum(pri.urgent)})` : 'no prior data',
        trend: trend(cur.urgent, pri.urgent),
        trendIsPositive: false,
      },
    ],
  }
}

// ── Finance ─────────────────────────────────────────────────

async function fetchFinance(dates: PeriodDates): Promise<PillarData> {
  const supabase = createServerClient()

  const { data: accountsDept } = await supabase
    .from('hod_departments')
    .select('id')
    .eq('slug', 'accounts')
    .single()

  const deptId = accountsDept?.id

  const [curReportsRes, priReportsRes, curBookingsRes, priBookingsRes] = await Promise.all([
    deptId
      ? supabase
          .from('hod_daily_reports')
          .select('report_data')
          .eq('department_id', deptId)
          .gte('report_date', dates.currentStart)
          .lte('report_date', dates.currentEnd)
      : Promise.resolve({ data: null }),
    deptId
      ? supabase
          .from('hod_daily_reports')
          .select('report_data')
          .eq('department_id', deptId)
          .gte('report_date', dates.priorStart)
          .lte('report_date', dates.priorEnd)
      : Promise.resolve({ data: null }),
    supabase
      .from('bookings')
      .select('agreed_rate_per_night, check_in, check_out')
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .gte('check_in', dates.currentStart)
      .lte('check_in', dates.currentEnd),
    supabase
      .from('bookings')
      .select('agreed_rate_per_night, check_in, check_out')
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .gte('check_in', dates.priorStart)
      .lte('check_in', dates.priorEnd),
  ])

  function sumReportField(rows: { report_data: unknown }[] | null, field: string): number {
    let total = 0
    for (const r of rows ?? []) {
      const data = r.report_data as Record<string, unknown> | null
      const val = Number(data?.[field] ?? 0)
      if (Number.isFinite(val)) total += val
    }
    return total
  }

  function sumBookingRevenue(rows: { agreed_rate_per_night: number | null; check_in: string; check_out: string }[] | null): number {
    let total = 0
    for (const b of rows ?? []) {
      const rate = b.agreed_rate_per_night ?? 0
      const nights = Math.max(1, Math.ceil(
        (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000
      ))
      total += rate * nights
    }
    return total
  }

  const curSales = sumReportField(curReportsRes.data as { report_data: unknown }[] | null, 'daily_total_sales')
  const priSales = sumReportField(priReportsRes.data as { report_data: unknown }[] | null, 'daily_total_sales')
  const curExpenses = sumReportField(curReportsRes.data as { report_data: unknown }[] | null, 'daily_total_expenses')
  const priExpenses = sumReportField(priReportsRes.data as { report_data: unknown }[] | null, 'daily_total_expenses')
  const curBookRev = sumBookingRevenue(curBookingsRes.data)
  const priBookRev = sumBookingRevenue(priBookingsRes.data)
  const curNetIncome = curSales - curExpenses
  const priNetIncome = priSales - priExpenses

  return {
    id: 'finance',
    label: 'Finance',
    href: '/operations',
    cards: [
      {
        title: 'Net sales (UGX)',
        value: formatUGX(curSales),
        subtitle: priSales ? `${dates.label} (${formatUGX(priSales)})` : 'no prior data',
        trend: trend(curSales, priSales),
        trendIsPositive: true,
      },
      {
        title: 'Booking revenue (USD)',
        value: formatUSD(curBookRev),
        subtitle: priBookRev ? `${dates.label} (${formatUSD(priBookRev)})` : 'no prior data',
        trend: trend(curBookRev, priBookRev),
        trendIsPositive: true,
      },
      {
        title: 'Expenses (UGX)',
        value: formatUGX(curExpenses),
        subtitle: priExpenses ? `${dates.label} (${formatUGX(priExpenses)})` : 'no prior data',
        trend: trend(curExpenses, priExpenses),
        trendIsPositive: false,
      },
      {
        title: 'Net income (UGX)',
        value: formatUGX(curNetIncome),
        subtitle: priNetIncome ? `${dates.label} (${formatUGX(priNetIncome)})` : 'no prior data',
        trend: trend(curNetIncome, priNetIncome),
        trendIsPositive: true,
      },
    ],
  }
}

// ── Accommodation ───────────────────────────────────────────

async function fetchAccommodation(dates: PeriodDates, period: PeriodKey, today: string): Promise<PillarData> {
  const supabase = createServerClient()
  const priorDay = priorEquivalentDay(period, today)

  const [
    curPeriodBookingsRes,
    priPeriodBookingsRes,
    unitsRes,
    arrivalsRes,
    curRevenueRes,
    priRevenueRes,
    activeRes,
    priorActiveRes,
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, check_in, check_out, booking_rooms(unit_id)')
      .lte('check_in', dates.currentEnd)
      .gt('check_out', dates.currentStart)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('id, check_in, check_out, booking_rooms(unit_id)')
      .lte('check_in', dates.priorEnd)
      .gt('check_out', dates.priorStart)
      .neq('status', 'cancelled'),
    supabase
      .from('accommodation_units')
      .select('id')
      .eq('status', 'active'),
    supabase
      .from('bookings')
      .select('id')
      .eq('check_in', today)
      .in('status', ['confirmed', 'checked_in']),
    supabase
      .from('bookings')
      .select('agreed_rate_per_night, check_in, check_out')
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .gte('check_in', dates.currentStart)
      .lte('check_in', dates.currentEnd),
    supabase
      .from('bookings')
      .select('agreed_rate_per_night, check_in, check_out')
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .gte('check_in', dates.priorStart)
      .lte('check_in', dates.priorEnd),
    supabase
      .from('bookings')
      .select('id')
      .gt('check_out', today)
      .in('status', ['confirmed', 'checked_in']),
    supabase
      .from('bookings')
      .select('id')
      .gt('check_out', priorDay)
      .in('status', ['confirmed', 'checked_in']),
  ])

  type OccBooking = { check_in: string; check_out: string; booking_rooms: { unit_id: string }[] | null }

  function avgOccupancy(bookings: OccBooking[] | null, periodStart: string, periodEnd: string, units: number): number {
    if (!units || !bookings?.length) return 0
    const start = new Date(periodStart + 'T12:00:00Z')
    const end = new Date(periodEnd + 'T12:00:00Z')
    const numDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    let totalOccupied = 0
    for (let i = 0; i < numDays; i++) {
      const day = fmt(new Date(start.getTime() + i * 86_400_000))
      const ids = new Set<string>()
      for (const b of bookings) {
        if (b.check_in <= day && b.check_out > day) {
          for (const r of (b.booking_rooms ?? []) as { unit_id: string }[]) ids.add(r.unit_id)
        }
      }
      totalOccupied += ids.size
    }
    return Math.round((totalOccupied / (units * numDays)) * 100)
  }

  function sumRevenue(rows: { agreed_rate_per_night: number | null; check_in: string; check_out: string }[] | null): number {
    let total = 0
    for (const b of rows ?? []) {
      const rate = b.agreed_rate_per_night ?? 0
      const nights = Math.max(1, Math.ceil(
        (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000
      ))
      total += rate * nights
    }
    return total
  }

  const totalUnits = unitsRes.data?.length ?? 0
  const curOcc = avgOccupancy(
    curPeriodBookingsRes.data as OccBooking[] | null,
    dates.currentStart, dates.currentEnd, totalUnits,
  )
  const priOcc = avgOccupancy(
    priPeriodBookingsRes.data as OccBooking[] | null,
    dates.priorStart, dates.priorEnd, totalUnits,
  )
  const arrivalsCount = arrivalsRes.data?.length ?? 0
  const curRev = sumRevenue(curRevenueRes.data)
  const priRev = sumRevenue(priRevenueRes.data)
  const activeCount = activeRes.data?.length ?? 0
  const priorActiveCount = priorActiveRes.data?.length ?? 0

  return {
    id: 'accommodation',
    label: 'Accommodation',
    href: '/accommodation',
    cards: [
      {
        title: 'Avg occupancy',
        value: `${curOcc}%`,
        subtitle: priOcc ? `${dates.label} (${priOcc}%)` : 'no prior data',
        trend: trend(curOcc, priOcc),
        trendIsPositive: true,
      },
      {
        title: 'Arrivals today',
        value: formatNum(arrivalsCount),
        subtitle: 'scheduled check-ins',
        trend: 'flat' as const,
        trendIsPositive: true,
      },
      {
        title: 'Period revenue',
        value: formatUSD(curRev),
        subtitle: priRev ? `${dates.label} (${formatUSD(priRev)})` : 'no prior data',
        trend: trend(curRev, priRev),
        trendIsPositive: true,
      },
      {
        title: 'Active bookings',
        value: formatNum(activeCount),
        subtitle: priorActiveCount ? `${dates.label} (${formatNum(priorActiveCount)})` : 'no prior data',
        trend: trend(activeCount, priorActiveCount),
        trendIsPositive: true,
      },
    ],
  }
}

// ── People ──────────────────────────────────────────────────

async function fetchPeople(dates: PeriodDates, today: string): Promise<PillarData> {
  const supabase = createServerClient()

  const todayDate = new Date(today + 'T12:00:00Z')
  const dow = todayDate.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekMonday = new Date(todayDate)
  weekMonday.setUTCDate(todayDate.getUTCDate() + mondayOffset)
  const weekSunday = new Date(weekMonday)
  weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)
  const weekStart = fmt(weekMonday)
  const weekEnd = fmt(weekSunday)

  const OPEN_STATUSES = ['open', 'submitted', 'rejected']

  const [currentRes, priorRes, dueRes] = await Promise.all([
    supabase
      .from('hod_meeting_action_items')
      .select('id, deadline, status')
      .in('status', OPEN_STATUSES)
      .gte('created_at', dates.currentStart + 'T00:00:00')
      .lte('created_at', dates.currentEnd + 'T23:59:59'),
    supabase
      .from('hod_meeting_action_items')
      .select('id, deadline, status')
      .in('status', OPEN_STATUSES)
      .gte('created_at', dates.priorStart + 'T00:00:00')
      .lte('created_at', dates.priorEnd + 'T23:59:59'),
    supabase
      .from('hod_meeting_action_items')
      .select('id')
      .in('status', OPEN_STATUSES)
      .gte('deadline', weekStart)
      .lte('deadline', weekEnd),
  ])

  const curItems = currentRes.data ?? []
  const priItems = priorRes.data ?? []
  const openCount = curItems.length
  const overdueCount = curItems.filter(a => a.deadline && a.deadline < today).length
  const priorOpenCount = priItems.length
  const priorOverdue = priItems.filter(a => a.deadline && a.deadline < dates.priorEnd).length
  const dueThisWeek = dueRes.data?.length ?? 0

  return {
    id: 'people',
    label: 'People',
    href: '/meetings',
    cards: [
      {
        title: 'Open actions',
        value: formatNum(openCount),
        subtitle: priorOpenCount ? `${dates.label} (${formatNum(priorOpenCount)})` : 'no prior data',
        trend: trend(openCount, priorOpenCount),
        trendIsPositive: false,
      },
      {
        title: 'Overdue items',
        value: formatNum(overdueCount),
        subtitle: priorOverdue ? `${dates.label} (${formatNum(priorOverdue)})` : 'no prior data',
        trend: trend(overdueCount, priorOverdue),
        trendIsPositive: false,
      },
      {
        title: 'Due this week',
        value: formatNum(dueThisWeek),
        subtitle: 'current week deadlines',
        trend: 'flat' as const,
        trendIsPositive: true,
      },
    ],
  }
}

// ── Route handler ───────────────────────────────────────────

export const GET = withAdminAuth(async ({ request }) => {
  const url = new URL(request.url)
  const period = (url.searchParams.get('period') ?? 'week') as PeriodKey
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const today = getKampalaDateStr(new Date())
  const dates = computePeriodDates(period, today)

  const [operations, finance, accommodation, people] = await Promise.all([
    fetchOperations(dates),
    fetchFinance(dates),
    fetchAccommodation(dates, period, today),
    fetchPeople(dates, today),
  ])

  return NextResponse.json({
    period,
    periodLabel: dates.label,
    pillars: [operations, finance, accommodation, people],
  })
}, { capability: 'overview' })
