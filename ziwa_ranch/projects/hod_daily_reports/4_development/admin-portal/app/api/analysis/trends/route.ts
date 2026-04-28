import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter, OPENROUTER_MODEL } from '@/lib/openrouter'
import { getKampalaDateStr } from '@/lib/submission-status'
import { extractKeyMetrics, formatMetricsForPrompt, type DepartmentMetrics } from '@/lib/extract-metrics'
import { getFormBySlug } from '@/config/forms'
import { isSectionMarkedNA } from '@hod/shared/lib/na-markers'
import { buildReportSignature, parseTrendInsights } from '@/lib/analysis-reliability'

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const authError = await verifyAdminAuth('analysis')
  if (authError) return authError

  const supabase = createServerClient()
  const today = getKampalaDateStr(new Date())
  const yesterday = addDays(today, -1)
  const thisWeekStart = getWeekStart(yesterday)
  const priorWindowStart = addDays(thisWeekStart, -28)
  const cacheKey = `trend:${thisWeekStart}`

  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('id, edited_at, submitted_at, report_data, department_id, report_date, ai_flags, hod_departments(name, slug)')
    .gte('report_date', priorWindowStart)
    .lte('report_date', yesterday)
    .order('report_date')

  if (!reports || reports.length < 5) {
    return NextResponse.json({ insights: [], message: 'Not enough data for trend analysis.' })
  }

  const signature = buildReportSignature(
    reports.map((r) => ({
      id: r.id as string,
      edited_at: (r as Record<string, unknown>).edited_at as string | null,
      submitted_at: (r as Record<string, unknown>).submitted_at as string | null,
    }))
  )

  const { data: cached } = await supabase
    .from('hod_analysis_cache')
    .select('analysis_data, generated_at')
    .eq('period_type', 'trend_alert')
    .eq('period_key', cacheKey)
    .maybeSingle()

  const cachedData = cached?.analysis_data as Record<string, unknown> | null
  if (cached && cachedData?.signature === signature) {
    return NextResponse.json({
      ...cachedData,
      cached: true,
      generated_at: cached.generated_at,
    })
  }

  const currentWeekMetrics: DepartmentMetrics[] = []
  const priorMetrics: DepartmentMetrics[] = []

  for (const r of reports) {
    const dept = r.hod_departments as unknown as { name: string; slug: string } | { name: string; slug: string }[] | null
    const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
    const deptSlug = (Array.isArray(dept) ? dept[0]?.slug : dept?.slug) ?? ''
    const data = r.report_data as Record<string, unknown> | null
    if (!data) continue

    const formConfig = getFormBySlug(deptSlug)
    if (!formConfig) continue

    const metrics = extractKeyMetrics(data, formConfig)
    const entry: DepartmentMetrics = {
      department: deptName,
      slug: deptSlug,
      reportDate: r.report_date as string,
      metrics,
    }

    if ((r.report_date as string) >= thisWeekStart) {
      currentWeekMetrics.push(entry)
    } else {
      priorMetrics.push(entry)
    }
  }

  const currentMetricsText = formatMetricsForPrompt(currentWeekMetrics)
  const priorMetricsText = formatMetricsForPrompt(priorMetrics)

  const challengeNotes: string[] = []
  const naSections: string[] = []

  for (const r of reports) {
    if ((r.report_date as string) < thisWeekStart) continue
    const data = r.report_data as Record<string, unknown> | null
    if (!data) continue
    const dept = r.hod_departments as unknown as { name: string; slug: string } | { name: string; slug: string }[] | null
    const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
    const deptSlug = (Array.isArray(dept) ? dept[0]?.slug : dept?.slug) ?? ''
    const challenges = String(data.challenges_successes ?? '').trim()
    if (challenges.length > 3) {
      challengeNotes.push(`[${r.report_date}] ${deptName}: ${challenges}`)
    }

    const formConfig = getFormBySlug(deptSlug)
    if (!formConfig) continue
    for (const section of formConfig.sections) {
      if (isSectionMarkedNA(section, data)) {
        naSections.push(`${deptName}: "${section.title}" marked N/A on ${r.report_date}`)
      }
    }
  }

  try {
    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You are an operational analyst at Ziwa Rhino And Wildlife Ranch in Uganda. You detect trends, anomalies, and patterns across department reports.

You will receive numeric metrics from the current week and the prior 4 weeks. Compare them and surface insights.

Write in simple, clear British English. Return a JSON array of insight objects. Each insight:
{
  "department": "Department name or 'Cross-departmental'",
  "title": "Short headline (max 10 words)",
  "detail": "One sentence explaining the trend or anomaly",
  "severity": "info" | "warning" | "alert",
  "category": "stock" | "visitors" | "compliance" | "operations" | "financial" | "staffing"
}

Rules:
- Flag stock quantities that changed by more than 30% vs the 4-week average
- Flag departments that stopped reporting certain sections (excessive N/A usage)
- Flag visitor count anomalies (significant increases or decreases)
- Flag financial metric deviations
- Identify cross-departmental discrepancies (e.g. guest entries vs meals served)
- Return 3-8 insights. If nothing notable, return an empty array []
- Be factual. Never invent data. Only report what the numbers show.
- Return ONLY the JSON array, no other text.`,
        },
        {
          role: 'user',
          content: `Trend analysis for week starting ${thisWeekStart}.

CURRENT WEEK METRICS (${thisWeekStart} to ${yesterday}):
${currentMetricsText || 'No numeric data collected.'}

PRIOR 4 WEEKS METRICS (${priorWindowStart} to ${addDays(thisWeekStart, -1)}):
${priorMetricsText || 'No prior data available.'}

${challengeNotes.length > 0 ? `DEPARTMENT NOTES (current week):\n${challengeNotes.join('\n')}` : ''}

${naSections.length > 0 ? `N/A SECTIONS (current week):\n${naSections.join('\n')}` : ''}`,
        },
      ],
      maxTokens: 1200,
      temperature: 0.2,
      referer: 'https://hod-admin-portal.netlify.app',
      title: 'HOD Trend Analysis',
    })

    const insights = parseTrendInsights(result.content)
    if (insights === null) {
      return NextResponse.json({
        insights: [],
        week_start: thisWeekStart,
        report_count: reports.length,
        error: 'Trend analysis returned invalid JSON',
        degraded: true,
      })
    }

    const trendData = {
      insights,
      week_start: thisWeekStart,
      report_count: reports.length,
      departments_analysed: new Set(
        reports.map((r) => {
          const dept = r.hod_departments as unknown as { slug?: string } | { slug?: string }[] | null
          return (Array.isArray(dept) ? dept[0]?.slug : dept?.slug) ?? 'unknown'
        })
      ).size,
      signature,
    }

    try {
      await supabase
        .from('hod_analysis_cache')
        .upsert({
          period_type: 'trend_alert',
          period_key: cacheKey,
          analysis_data: trendData,
          generated_at: new Date().toISOString(),
          model_used: OPENROUTER_MODEL,
        }, { onConflict: 'period_type,period_key' })
      await supabase
        .from('hod_analysis_cache')
        .delete()
        .eq('period_type', 'trend_alert')
        .neq('period_key', cacheKey)
        .lt('generated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } catch (cacheErr) {
      console.error('Trend cache write failed (non-blocking):', cacheErr)
    }

    return NextResponse.json({ ...trendData, cached: false, generated_at: new Date().toISOString() })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Trend analysis failed:', errMsg)
    return NextResponse.json({
      insights: [],
      week_start: thisWeekStart,
      report_count: reports.length,
      error: 'Trend analysis unavailable',
      degraded: true,
      degraded_reason: errMsg.slice(0, 200),
    })
  }
}
