import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter, OPENROUTER_MODEL } from '@/lib/openrouter'
import { getKampalaDateStr } from '@/lib/submission-status'
import { extractKeyMetrics, formatMetricsForPrompt, type DepartmentMetrics } from '@/lib/extract-metrics'
import { getFormBySlug } from '@/config/forms'
import { buildReportSignature, isValidAnalysisText, normaliseAiText } from '@/lib/analysis-reliability'

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function isPeriodComplete(periodType: string, periodKey: string): boolean {
  const now = new Date()
  const today = getKampalaDateStr(now)
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: 'numeric', hour12: false }))

  if (periodType === 'day') {
    if (periodKey >= today) return false
    if (periodKey === (() => {
      const y = new Date(today + 'T00:00:00Z')
      y.setUTCDate(y.getUTCDate() - 1)
      return y.toISOString().split('T')[0]
    })()) {
      return hour >= 18
    }
    return true
  }

  if (periodType === 'week') {
    const currentWeek = getISOWeek(today)
    return periodKey < currentWeek
  }

  if (periodType === 'month') {
    const currentMonth = today.slice(0, 7)
    return periodKey < currentMonth
  }

  return true
}

function getDateRangeForPeriod(periodType: string, periodKey: string): { from: string; to: string } {
  if (periodType === 'day') {
    return { from: periodKey, to: periodKey }
  }

  if (periodType === 'week') {
    const [yearStr, weekStr] = periodKey.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)
    const jan1 = new Date(Date.UTC(year, 0, 1))
    const dayOffset = (jan1.getUTCDay() <= 4 ? 1 : 8) - jan1.getUTCDay()
    const firstMonday = new Date(Date.UTC(year, 0, 1 + dayOffset))
    const weekStart = new Date(firstMonday.getTime() + (week - 1) * 7 * 86400000)
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)
    return {
      from: weekStart.toISOString().split('T')[0],
      to: weekEnd.toISOString().split('T')[0],
    }
  }

  if (periodType === 'month') {
    const [year, month] = periodKey.split('-').map(Number)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
      from: `${periodKey}-01`,
      to: `${periodKey}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  return { from: periodKey, to: periodKey }
}

function buildAnalysisFallbackSummary(reason: 'invalid' | 'unavailable'): string {
  const unavailableLine = reason === 'invalid'
    ? 'Generated analysis was invalid and has been discarded.'
    : 'Automated analysis is temporarily unavailable.'
  return [
    'SUMMARY',
    unavailableLine,
    '',
    'BY DEPARTMENT',
    'No validated AI output is available right now.',
    '',
    'ISSUES',
    'No issues flagged while AI is unavailable.',
    '',
    'ACTIONS',
    'Retry analysis in a few minutes.',
    '',
    'PATTERNS',
    'No patterns could be computed without valid AI output.',
    '',
    'CROSS-DEPARTMENT',
    'No cross-departmental checks available right now.',
  ].join('\n')
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdminAuth('analysis')
  if (authError) return authError

  try {
    const body = await request.json()
    const { period_type, period_key, force, feedback } = body as { period_type: string; period_key: string; force?: boolean; feedback?: unknown }

    if (!period_type || !period_key) {
      return NextResponse.json({ error: 'period_type and period_key required' }, { status: 400 })
    }

    if (!['day', 'week', 'month'].includes(period_type)) {
      return NextResponse.json({ error: 'Invalid period_type' }, { status: 400 })
    }

    let feedbackPrefix = ''
    if (feedback !== undefined && feedback !== null) {
      if (typeof feedback !== 'string') {
        return NextResponse.json({ error: 'feedback must be a string' }, { status: 400 })
      }
      const trimmed = feedback.trim()
      if (trimmed.length > 500) {
        return NextResponse.json({ error: 'feedback must be 500 characters or fewer' }, { status: 400 })
      }
      if (trimmed.length > 0) {
        feedbackPrefix = `[USER INSTRUCTION] ${trimmed} [/USER INSTRUCTION]\n\n`
      }
    }

    if (!isPeriodComplete(period_type, period_key)) {
      return NextResponse.json({ error: 'This period is not yet complete.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { from, to } = getDateRangeForPeriod(period_type, period_key)

    const { data: signatureRows } = await supabase
      .from('hod_daily_reports')
      .select('id, edited_at, submitted_at')
      .gte('report_date', from)
      .lte('report_date', to)

    if (!signatureRows || signatureRows.length === 0) {
      return NextResponse.json({
        analysis: {
          summary: 'No reports found for this period.',
          report_count: 0,
          notes_count: 0,
          period: { type: period_type, key: period_key, from, to },
          signature: '',
        },
        cached: false,
      })
    }

    const signature = buildReportSignature(signatureRows)

    if (force) {
      await supabase
        .from('hod_analysis_cache')
        .delete()
        .eq('period_type', period_type)
        .eq('period_key', period_key)
    } else {
      const { data: cached } = await supabase
        .from('hod_analysis_cache')
        .select('*')
        .eq('period_type', period_type)
        .eq('period_key', period_key)
        .maybeSingle()

      const cachedSignature = (cached?.analysis_data as Record<string, unknown> | null)?.signature
      if (cached && cachedSignature === signature) {
        return NextResponse.json({
          analysis: cached.analysis_data,
          cached: true,
          generated_at: cached.generated_at,
        })
      }
    }

    const [{ data: reports }, { data: periodBookings }, { data: allUnits }, { data: actionItems }] = await Promise.all([
      supabase
        .from('hod_daily_reports')
        .select('report_data, department_id, report_date, ai_flags, hod_departments(name, slug)')
        .gte('report_date', from)
        .lte('report_date', to)
        .order('report_date'),
      supabase
        .from('bookings')
        .select('id, check_in, check_out, adults, children, status, agreed_rate_per_night, booking_rooms(unit_id)')
        .lte('check_in', to)
        .gt('check_out', from)
        .neq('status', 'cancelled'),
      supabase
        .from('accommodation_units')
        .select('id')
        .eq('status', 'active'),
      supabase
        .from('hod_meeting_action_items')
        .select('id, status, deadline')
        .in('status', ['open', 'in_progress'])
        .lte('deadline', to),
    ])

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        analysis: {
          summary: 'No reports found for this period.',
          report_count: 0,
          notes_count: 0,
          period: { type: period_type, key: period_key, from, to },
          signature,
        },
        cached: false,
      })
    }

    const totalUnitsCount = (allUnits ?? []).length
    const periodNights = Math.max(1, Math.ceil(
      (new Date(to + 'T12:00:00Z').getTime() - new Date(from + 'T12:00:00Z').getTime()) / 86400000
    ) + 1)
    let totalOccupiedUnitNights = 0
    let periodRevenue = 0
    for (const b of periodBookings ?? []) {
      const ci = b.check_in > from ? b.check_in : from
      const co = b.check_out < to ? b.check_out : to
      const nights = Math.max(0, Math.ceil(
        (new Date(co + 'T12:00:00Z').getTime() - new Date(ci + 'T12:00:00Z').getTime()) / 86400000
      ))
      const rooms = (b.booking_rooms ?? []).length || 1
      totalOccupiedUnitNights += nights * rooms
      if (b.agreed_rate_per_night && ['confirmed', 'checked_in', 'checked_out'].includes(b.status)) {
        periodRevenue += b.agreed_rate_per_night * nights
      }
    }
    const avgOccupancy = totalUnitsCount > 0 && periodNights > 0
      ? Math.round((totalOccupiedUnitNights / (totalUnitsCount * periodNights)) * 100)
      : 0

    const overdueActionItems = (actionItems ?? []).filter((a) => a.deadline && a.deadline < from).length
    const periodActionItems = (actionItems ?? []).filter(
      (a) => a.deadline && a.deadline >= from && a.deadline <= to
    ).length

    const departmentNotes: string[] = []
    const allMetrics: DepartmentMetrics[] = []

    for (const r of reports) {
      const data = r.report_data as Record<string, unknown> | null
      if (!data) continue
      const dept = r.hod_departments as unknown as { name: string; slug?: string } | { name: string; slug?: string }[] | null
      const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
      const deptSlug = (Array.isArray(dept) ? dept[0]?.slug : dept?.slug) ?? ''
      const challenges = String(data.challenges_successes ?? '').trim()
      if (challenges.length > 3) {
        const note = challenges.length > 200 ? `${challenges.slice(0, 200)}...` : challenges
        departmentNotes.push(`[${r.report_date}] ${deptName}: ${note}`)
      }

      const formConfig = getFormBySlug(deptSlug)
      if (formConfig) {
        const metrics = extractKeyMetrics(data, formConfig)
        if (metrics.length > 0) {
          allMetrics.push({
            department: deptName,
            slug: deptSlug,
            reportDate: r.report_date as string,
            metrics,
          })
        }
      }
    }

    const metricsText = formatMetricsForPrompt(allMetrics)
    const periodLabel = period_type === 'day' ? period_key : period_type === 'week' ? `Week ${period_key}` : `Month ${period_key}`
    const metricsLines = metricsText ? metricsText.split('\n') : []
    const cappedMetrics = metricsLines.length > 40
      ? `${metricsLines.slice(0, 40).join('\n')}\n(${metricsLines.length - 40} more lines omitted)`
      : metricsText

    const operationalContext = [
      '',
      'OPERATIONAL CONTEXT (factual, for reference only):',
      `Accommodation: ${avgOccupancy}% average occupancy over the period. ${(periodBookings ?? []).length} active bookings. Period revenue: ${periodRevenue > 0 ? `$${periodRevenue.toLocaleString()}` : 'not available'}.`,
      `Action items: ${overdueActionItems} overdue before this period, ${periodActionItems} due within this period.`,
    ].join('\n')

    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You are an operations analyst at Ziwa Rhino And Wildlife Ranch, Uganda. You write concise operational analysis for the Chairman, CEO, and General Manager.

Write in plain text only. No markdown formatting — no #, **, ---, or bullet characters. Use these exact section headers in UPPERCASE, each separated by a blank line:

SUMMARY
2-3 sentences only: how many departments reported, overall picture, one standout item.

BY DEPARTMENT
One sentence per department that has something notable. Lead with the department name in bold-free plain text. Skip departments with nothing to report.

ISSUES
Each issue on its own line. Format: "Department — issue." If none, write "No issues flagged."

ACTIONS
Each action on its own line. Include who should act. If none, write "No actions required."

PATTERNS
One sentence per recurring theme across departments. If none, write "No patterns observed."

CROSS-DEPARTMENT
Note data mismatches between departments (e.g. guest count vs meals served, store issues vs kitchen stock). One sentence each. If none, write "No discrepancies found."

Rules: Be factual only. Never invent content. No filler, no repetition. Under 800 words total. Use the operational context provided to inform your analysis but do not simply parrot it — integrate it naturally.`,
        },
        {
          role: 'user',
          content: `${feedbackPrefix}Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).

DEPARTMENT NOTES:
${departmentNotes.length > 0 ? departmentNotes.join('\n') : 'No substantive notes in this period.'}

NUMERIC METRICS:
${cappedMetrics || 'No numeric data extracted.'}${operationalContext}`,
        },
      ],
      maxTokens: 1200,
      temperature: 0.2,
      referer: 'https://hod-admin-portal.netlify.app',
      title: 'HOD Analysis',
    })

    if (!isValidAnalysisText(result.content)) {
      return NextResponse.json({
        analysis: {
          summary: buildAnalysisFallbackSummary('invalid'),
          report_count: reports.length,
          notes_count: departmentNotes.length,
          period: { type: period_type, key: period_key, from, to },
          signature,
        },
        cached: false,
        degraded: true,
        generated_at: new Date().toISOString(),
      })
    }

    const analysisData = {
      summary: normaliseAiText(result.content),
      report_count: reports.length,
      notes_count: departmentNotes.length,
      period: { type: period_type, key: period_key, from, to },
      signature,
    }

    try {
      await supabase
        .from('hod_analysis_cache')
        .upsert({
          period_type,
          period_key,
          analysis_data: analysisData,
          generated_at: new Date().toISOString(),
          model_used: OPENROUTER_MODEL,
        }, { onConflict: 'period_type,period_key' })
      await supabase
        .from('hod_analysis_cache')
        .delete()
        .eq('period_type', period_type)
        .neq('period_key', period_key)
        .lt('generated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } catch (cacheErr) {
      console.error('Analysis cache write failed (non-blocking):', cacheErr)
    }

    return NextResponse.json({ analysis: analysisData, cached: false, generated_at: new Date().toISOString() })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Analysis generation error:', errMsg)
    return NextResponse.json({
      analysis: {
        summary: buildAnalysisFallbackSummary('unavailable'),
        report_count: 0,
        notes_count: 0,
      },
      cached: false,
      degraded: true,
      degraded_reason: errMsg.slice(0, 200),
      generated_at: new Date().toISOString(),
    })
  }
}
