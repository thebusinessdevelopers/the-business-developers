import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter, OPENROUTER_MODEL } from '@/lib/openrouter'
import { getKampalaDateStr } from '@/lib/submission-status'
import { extractKeyMetrics, formatMetricsForPrompt, type DepartmentMetrics } from '@/lib/extract-metrics'
import { getFormBySlug } from '@/config/forms'
import { buildReportSignature, isValidAnalysisText, normaliseAiText } from '@/lib/analysis-reliability'

function getWeekBounds(today: string): { weekStart: string; weekEnd: string } {
  const d = new Date(today + 'T12:00:00Z')
  const day = d.getUTCDay() || 7
  const monday = new Date(d.getTime() - (day - 1) * 86400000)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdminAuth('analysis')
  if (authError) return authError

  const supabase = createServerClient()
  const body = await request.json().catch(() => ({}))
  const bodyRecord = body as Record<string, unknown>
  const force = Boolean(bodyRecord.force)
  const feedbackRaw = bodyRecord.feedback
  let feedbackPrefix = ''
  if (feedbackRaw !== undefined && feedbackRaw !== null) {
    if (typeof feedbackRaw !== 'string') {
      return NextResponse.json({ error: 'feedback must be a string' }, { status: 400 })
    }
    const trimmed = feedbackRaw.trim()
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'feedback must be 500 characters or fewer' }, { status: 400 })
    }
    if (trimmed.length > 0) {
      feedbackPrefix = `[USER INSTRUCTION] ${trimmed} [/USER INSTRUCTION]\n\n`
    }
  }
  const today = getKampalaDateStr(new Date())
  const { weekStart, weekEnd } = getWeekBounds(today)
  const cacheKey = `weekly_brief:${weekStart}`

  const { data: signatureRows } = await supabase
    .from('hod_daily_reports')
    .select('department_id, report_date, edited_at, submitted_at')
    .gte('report_date', weekStart)
    .lte('report_date', weekEnd)

  const signature = buildReportSignature(
    (signatureRows ?? []).map((r) => ({
      id: r.department_id as string,
      edited_at: r.edited_at as string | null,
      submitted_at: (r.submitted_at as string | null) ?? (r.report_date as string),
    }))
  )

  if (!force) {
    const { data: cached } = await supabase
      .from('hod_analysis_cache')
      .select('analysis_data, generated_at')
      .eq('period_type', 'weekly_brief')
      .eq('period_key', cacheKey)
      .maybeSingle()

    if (cached) {
      const cachedData = cached.analysis_data as Record<string, unknown> | null
      const generatedAt = cached.generated_at as string
      const ageMs = Date.now() - new Date(generatedAt).getTime()
      const twoHoursMs = 2 * 60 * 60 * 1000
      if (cachedData && cachedData.signature === signature && ageMs < twoHoursMs) {
        return NextResponse.json({
          ...cachedData,
          cached: true,
          generated_at: generatedAt,
        })
      }
    }
  }

  const [{ data: reports }, { data: weekBookings }, { data: allUnits }, { data: actionItems }] = await Promise.all([
    supabase
      .from('hod_daily_reports')
      .select('report_data, department_id, report_date, submitted_by, ai_flags, hod_departments(name, slug)')
      .gte('report_date', weekStart)
      .lte('report_date', weekEnd)
      .order('report_date'),
    supabase
      .from('bookings')
      .select('id, check_in, check_out, adults, children, status, agreed_rate_per_night, booking_rooms(unit_id)')
      .lte('check_in', weekEnd)
      .gt('check_out', weekStart)
      .neq('status', 'cancelled'),
    supabase
      .from('accommodation_units')
      .select('id')
      .eq('status', 'active'),
    supabase
      .from('hod_meeting_action_items')
      .select('id, status, deadline')
      .in('status', ['open', 'in_progress']),
  ])

  if (!reports || reports.length === 0) {
    return NextResponse.json({
      brief: 'No reports found for this week.',
      week_start: weekStart,
      week_end: weekEnd,
      report_count: 0,
    })
  }

  const totalUnitsCount = (allUnits ?? []).length
  const periodNights = Math.max(1, Math.ceil(
    (new Date(weekEnd + 'T12:00:00Z').getTime() - new Date(weekStart + 'T12:00:00Z').getTime()) / 86400000
  ) + 1)
  let totalOccupiedUnitNights = 0
  let weekRevenue = 0
  let totalGuests = 0
  for (const b of weekBookings ?? []) {
    const ci = b.check_in > weekStart ? b.check_in : weekStart
    const co = b.check_out < weekEnd ? b.check_out : weekEnd
    const nights = Math.max(0, Math.ceil(
      (new Date(co + 'T12:00:00Z').getTime() - new Date(ci + 'T12:00:00Z').getTime()) / 86400000
    ))
    const rooms = (b.booking_rooms ?? []).length || 1
    totalOccupiedUnitNights += nights * rooms
    totalGuests += b.adults + b.children
    if (b.agreed_rate_per_night && ['confirmed', 'checked_in', 'checked_out'].includes(b.status)) {
      weekRevenue += b.agreed_rate_per_night * nights
    }
  }
  const avgOccupancy = totalUnitsCount > 0 && periodNights > 0
    ? Math.round((totalOccupiedUnitNights / (totalUnitsCount * periodNights)) * 100)
    : 0

  const overdueItems = (actionItems ?? []).filter(
    (a) => a.deadline && a.deadline < weekStart
  ).length
  const weekItems = (actionItems ?? []).filter(
    (a) => a.deadline && a.deadline >= weekStart && a.deadline <= weekEnd
  ).length

  const departmentSummaries: string[] = []
  const allMetrics: DepartmentMetrics[] = []
  const deptReportDays = new Map<string, number>()
  let urgentFlagCount = 0

  for (const r of reports) {
    const data = r.report_data as Record<string, unknown> | null
    if (!data) continue
    const dept = r.hod_departments as unknown as { name: string; slug?: string } | { name: string; slug?: string }[] | null
    const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
    const deptSlug = (Array.isArray(dept) ? dept[0]?.slug : dept?.slug) ?? ''

    deptReportDays.set(deptName, (deptReportDays.get(deptName) ?? 0) + 1)

    const challenges = String(data.challenges_successes ?? '').trim()
    const flags = r.ai_flags as { top_label?: string; top_score?: number } | null
    if (flags?.top_label === 'urgent issue' && (flags.top_score ?? 0) >= 0.4) urgentFlagCount++

    if (challenges.length > 3) {
      const note = challenges.length > 150 ? `${challenges.slice(0, 150)}...` : challenges
      departmentSummaries.push(`[${r.report_date}] ${deptName}: ${note}`)
    }

    const formConfig = getFormBySlug(deptSlug)
    if (formConfig) {
      const metrics = extractKeyMetrics(data, formConfig)
      if (metrics.length > 0) {
        allMetrics.push({ department: deptName, slug: deptSlug, reportDate: r.report_date as string, metrics })
      }
    }
  }

  const metricsText = formatMetricsForPrompt(allMetrics)
  const metricsLines = metricsText ? metricsText.split('\n') : []
  const cappedMetrics = metricsLines.length > 50
    ? `${metricsLines.slice(0, 50).join('\n')}\n(${metricsLines.length - 50} more lines omitted)`
    : metricsText

  try {
    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You are a senior operations analyst at Ziwa Rhino And Wildlife Ranch, Uganda. You produce a weekly management brief for the Chairman, CEO, and General Manager.

Write in plain text only — no markdown. Use these exact section headers in UPPERCASE, separated by blank lines:

EXECUTIVE SUMMARY
3-5 sentences: overall week performance, standout achievements, critical concerns.

OPERATIONS
Department-by-department highlights for the week. One line per department with something notable. Skip departments with nothing to report.

ACCOMMODATION
Occupancy performance, guest numbers, revenue summary, notable bookings or issues.

FINANCE
Sales trends, expense highlights, any anomalies in financial data.

PEOPLE & MEETINGS
Action item status, staffing observations, meeting follow-ups.

PRIORITIES FOR NEXT WEEK
3-5 specific, actionable items for management attention.

Rules: Be factual. Never invent content. Under 1000 words. Integrate all provided context naturally.`,
        },
        {
          role: 'user',
          content: `${feedbackPrefix}Weekly management brief for ${weekStart} to ${weekEnd}.

${reports.length} reports from ${deptReportDays.size} departments. ${urgentFlagCount} urgent flags this week.

DEPARTMENT NOTES:
${departmentSummaries.length > 0 ? departmentSummaries.join('\n') : 'No substantive notes this week.'}

NUMERIC METRICS:
${cappedMetrics || 'No numeric data extracted.'}

ACCOMMODATION:
${avgOccupancy}% average occupancy. ${(weekBookings ?? []).length} bookings active. ${totalGuests} total guests. Week revenue: ${weekRevenue > 0 ? `$${weekRevenue.toLocaleString()}` : 'not available'}.

ACTION ITEMS:
${overdueItems} overdue from prior weeks. ${weekItems} due this week.`,
        },
      ],
      maxTokens: 1800,
      temperature: 0.2,
      referer: 'https://hod-admin-portal.netlify.app',
      title: 'HOD Weekly Brief',
    })

    if (!isValidAnalysisText(result.content)) {
      return NextResponse.json({
        brief: 'Weekly brief generation returned invalid output. Please retry.',
        week_start: weekStart,
        week_end: weekEnd,
        report_count: reports.length,
        degraded: true,
      })
    }

    const briefData = {
      brief: normaliseAiText(result.content),
      week_start: weekStart,
      week_end: weekEnd,
      report_count: reports.length,
      departments_reporting: deptReportDays.size,
      urgent_flags: urgentFlagCount,
      accommodation: { avg_occupancy: avgOccupancy, bookings: (weekBookings ?? []).length, revenue: weekRevenue },
      action_items: { overdue: overdueItems, due_this_week: weekItems },
      signature,
    }

    try {
      await supabase
        .from('hod_analysis_cache')
        .upsert({
          period_type: 'weekly_brief',
          period_key: cacheKey,
          analysis_data: briefData,
          generated_at: new Date().toISOString(),
          model_used: OPENROUTER_MODEL,
        }, { onConflict: 'period_type,period_key' })
      await supabase
        .from('hod_analysis_cache')
        .delete()
        .eq('period_type', 'weekly_brief')
        .neq('period_key', cacheKey)
        .lt('generated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } catch (cacheErr) {
      console.error('Weekly brief cache write failed (non-blocking):', cacheErr)
    }

    return NextResponse.json({ ...briefData, cached: false, generated_at: new Date().toISOString() })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Weekly brief generation failed:', errMsg)
    return NextResponse.json({
      brief: 'Weekly brief generation failed. Please retry.',
      week_start: weekStart,
      week_end: weekEnd,
      report_count: reports.length,
      degraded: true,
      degraded_reason: errMsg.slice(0, 200),
    })
  }
}
