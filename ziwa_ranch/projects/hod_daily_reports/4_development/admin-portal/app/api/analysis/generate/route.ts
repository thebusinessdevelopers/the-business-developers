import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter } from '@/lib/openrouter'
import { getKampalaDateStr } from '@/lib/submission-status'

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
    const year = parseInt(yearStr)
    const week = parseInt(weekStr)
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

export async function POST(request: NextRequest) {
  const authError = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { period_type, period_key } = body as { period_type: string; period_key: string }

    if (!period_type || !period_key) {
      return NextResponse.json({ error: 'period_type and period_key required' }, { status: 400 })
    }

    if (!['day', 'week', 'month'].includes(period_type)) {
      return NextResponse.json({ error: 'Invalid period_type' }, { status: 400 })
    }

    if (!isPeriodComplete(period_type, period_key)) {
      return NextResponse.json({ error: 'This period is not yet complete.' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: cached } = await supabase
      .from('hod_analysis_cache')
      .select('*')
      .eq('period_type', period_type)
      .eq('period_key', period_key)
      .maybeSingle()

    if (cached) {
      return NextResponse.json({ analysis: cached.analysis_data, cached: true, generated_at: cached.generated_at })
    }

    const { from, to } = getDateRangeForPeriod(period_type, period_key)

    const { data: reports } = await supabase
      .from('hod_daily_reports')
      .select('report_data, department_id, report_date, ai_flags, hod_departments(name)')
      .gte('report_date', from)
      .lte('report_date', to)
      .order('report_date')

    if (!reports || reports.length === 0) {
      return NextResponse.json({ analysis: { summary: 'No reports found for this period.' }, cached: false })
    }

    const departmentNotes: string[] = []
    for (const r of reports) {
      const data = r.report_data as Record<string, unknown> | null
      if (!data) continue
      const dept = r.hod_departments as unknown as { name: string } | { name: string }[] | null
      const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
      const challenges = String(data.challenges_successes ?? '').trim()
      if (challenges.length > 3) {
        departmentNotes.push(`[${r.report_date}] ${deptName}: ${challenges}`)
      }
    }

    const periodLabel = period_type === 'day' ? period_key
      : period_type === 'week' ? `Week ${period_key}`
      : `Month ${period_key}`

    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You are an executive analyst at Ziwa Rhino And Wildlife Ranch in Uganda. You analyse department reports for the General Manager, producing structured operational intelligence. Be concise, factual, and action-oriented. Identify: (1) Key accomplishments, (2) Issues requiring attention, (3) Cross-departmental patterns, (4) Recommended actions. If data is sparse, say so honestly. Do not invent content. Keep under 300 words. No markdown formatting — use plain text with clear section headers.`,
        },
        {
          role: 'user',
          content: `Analyse ${reports.length} reports from ${periodLabel} (${from} to ${to}).\n\n${departmentNotes.length > 0 ? departmentNotes.join('\n\n') : 'No substantive notes in this period.'}`,
        },
      ],
      maxTokens: 600,
      reasoningEffort: 'medium',
      referer: 'https://hod-admin-portal.netlify.app',
      title: 'HOD Analysis',
    })

    const analysisData = {
      summary: result.content,
      report_count: reports.length,
      notes_count: departmentNotes.length,
      period: { type: period_type, key: period_key, from, to },
    }

    await supabase
      .from('hod_analysis_cache')
      .upsert({
        period_type,
        period_key,
        analysis_data: analysisData,
        generated_at: new Date().toISOString(),
        model_used: 'openrouter/claude-sonnet-4.6',
      }, { onConflict: 'period_type,period_key' })

    return NextResponse.json({ analysis: analysisData, cached: false, generated_at: new Date().toISOString() })
  } catch (err) {
    console.error('Analysis generation error:', err)
    return NextResponse.json({ error: 'Analysis generation failed' }, { status: 500 })
  }
}
