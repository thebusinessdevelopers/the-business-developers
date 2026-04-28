import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter } from '@/lib/openrouter'
import { getFormBySlug, DEPARTMENT_FORMS } from '@/config/forms'
import { extractKeyMetrics, formatMetricsForPrompt, type DepartmentMetrics } from '@/lib/extract-metrics'
import { getSubmissionStatus, getStatusLabel } from '@/lib/submission-status'
import { isSectionMarkedNA } from '@hod/shared/lib/na-markers'
import { ROOM_BUILDINGS, ALL_ROOMS } from '@hod/shared/config/rooms'

interface ExportRequest {
  type: 'single' | 'range' | 'summary'
  department_ids?: string[]
  from?: string
  to?: string
  report_id?: string
  department_id?: string
  date?: string
}

function formatDateReadable(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRoomGrid(rooms: Record<string, unknown>): string {
  const lines: string[] = []
  const roomNameMap = new Map(ALL_ROOMS.map((r) => [r.slug, r.name]))

  const counts = { occupied: 0, vacant: 0, maintenance: 0, unavailable: 0 }

  for (const building of ROOM_BUILDINGS) {
    lines.push(`    ${building.building}`)
    for (const room of building.rooms) {
      const data = rooms[room.slug] as { status?: string; condition?: string; damages?: string; notes?: string } | undefined
      if (!data || !data.status) {
        lines.push(`      ${room.name}: Not set`)
        continue
      }
      const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1)
      const parts: string[] = [statusLabel]
      if (data.status in counts) counts[data.status as keyof typeof counts]++
      if (data.status === 'occupied') {
        if (data.condition) parts.push(data.condition)
        if (data.damages) parts.push(`Damages: ${data.damages}`)
      }
      if (data.notes) parts.push(`Notes: ${data.notes}`)
      lines.push(`      ${room.name}: ${parts.join(' — ')}`)
    }
  }

  const unmatched = Object.keys(rooms).filter((slug) => !roomNameMap.has(slug))
  if (unmatched.length > 0) {
    lines.push(`    Other`)
    for (const slug of unmatched) {
      const data = rooms[slug] as { status?: string } | undefined
      lines.push(`      ${slug}: ${data?.status || 'Not set'}`)
    }
  }

  const totals = [`${counts.occupied} occupied`, `${counts.vacant} vacant`]
  if (counts.maintenance > 0) totals.push(`${counts.maintenance} maintenance`)
  if (counts.unavailable > 0) totals.push(`${counts.unavailable} unavailable`)
  lines.push(`    Totals: ${totals.join(', ')}`)
  return lines.join('\n')
}

function formatObjectAsLines(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return '—'
  return entries
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      return `    ${label}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`
    })
    .join('\n')
}

function formatFieldValue(value: unknown, fieldType?: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    if (typeof value[0] === 'object') {
      return value.map((item, i) => {
        const entries = Object.entries(item as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
        return `  ${i + 1}. ${entries}`
      }).join('\n')
    }
    return value.join(', ')
  }
  if (typeof value === 'object') {
    if (fieldType === 'room_grid') {
      return formatRoomGrid(value as Record<string, unknown>)
    }
    return formatObjectAsLines(value as Record<string, unknown>)
  }
  return String(value)
}

function renderSingleReport(
  report: Record<string, unknown>,
  deptName: string,
  deptSlug: string,
  reportDate: string,
  submittedBy: string,
  submittedAt: string,
): string {
  const lines: string[] = []
  lines.push(`ZIWA RHINO AND WILDLIFE RANCH`)
  lines.push(`Daily Report — ${deptName}`)
  lines.push(`Date: ${formatDateReadable(reportDate)}`)
  lines.push(`Submitted by: ${submittedBy}`)
  const status = getSubmissionStatus(submittedAt, reportDate)
  if (status !== 'on_time') {
    lines.push(`Status: ${getStatusLabel(status)}`)
  }
  lines.push('')
  lines.push('─'.repeat(50))

  const formConfig = getFormBySlug(deptSlug)
  const data = report as Record<string, unknown>

  if (formConfig) {
    for (const section of formConfig.sections) {
      const isNA = isSectionMarkedNA(section, data)
      lines.push('')
      lines.push(section.title.toUpperCase())
      if (isNA) {
        lines.push('  Nothing to report (N/A)')
        continue
      }
      for (const field of section.fields) {
        const val = data[field.name]
        const formatted = formatFieldValue(val, field.type)
        if (formatted === '—' && !field.required) continue
        if (field.type === 'repeater' || field.type === 'inventory_grid' || field.type === 'room_grid') {
          lines.push(`  Q: ${field.label}`)
          lines.push(`  A:`)
          lines.push(formatted)
        } else if (formatted.includes('\n')) {
          lines.push(`  Q: ${field.label}`)
          lines.push(`  A:`)
          lines.push(formatted)
        } else {
          lines.push(`  Q: ${field.label}`)
          lines.push(`  A: ${formatted}`)
        }
      }
    }
  } else {
    for (const [key, val] of Object.entries(data)) {
      if (key.endsWith('__na')) continue
      const formatted = formatFieldValue(val)
      if (formatted !== '—') {
        lines.push(`  Q: ${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`)
        lines.push(`  A: ${formatted}`)
      }
    }
  }

  lines.push('')
  lines.push('─'.repeat(50))
  lines.push(`Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })}`)
  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdminAuth('exports')
  if (authError) return authError

  try {
    const body = (await request.json()) as ExportRequest

    if (!body.type || !['single', 'range', 'summary'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const supabase = createServerClient()

    if (body.type === 'single') {
      let reportQuery = supabase
        .from('hod_daily_reports')
        .select('id, report_data, department_id, report_date, submitted_by, submitted_at, hod_departments(name, slug)')

      if (body.report_id) {
        reportQuery = reportQuery.eq('id', body.report_id)
      } else if (body.department_id && body.date) {
        reportQuery = reportQuery.eq('department_id', body.department_id).eq('report_date', body.date)
      } else {
        return NextResponse.json({ error: 'Provide report_id, or department_id and date' }, { status: 400 })
      }

      const { data: report } = await reportQuery.maybeSingle()

      if (!report) {
        return NextResponse.json({ error: 'No report found for that department and date.' }, { status: 404 })
      }

      const dept = report.hod_departments as unknown as { name: string; slug: string }
      const text = renderSingleReport(
        report.report_data as Record<string, unknown>,
        dept.name,
        dept.slug,
        report.report_date as string,
        report.submitted_by as string,
        report.submitted_at as string,
      )

      return NextResponse.json({ content: text, type: 'single', format: 'text' })
    }

    if (body.type === 'range' || body.type === 'summary') {
      if (!body.from || !body.to) {
        return NextResponse.json({ error: 'from and to dates required' }, { status: 400 })
      }

      let query = supabase
        .from('hod_daily_reports')
        .select('id, report_data, department_id, report_date, submitted_by, submitted_at, ai_flags, hod_departments(name, slug)')
        .gte('report_date', body.from)
        .lte('report_date', body.to)
        .order('report_date')

      if (body.department_ids && body.department_ids.length > 0) {
        query = query.in('department_id', body.department_ids)
      }

      const { data: reports } = await query

      if (!reports || reports.length === 0) {
        return NextResponse.json({ error: 'No reports found for this period' }, { status: 404 })
      }

      if (body.type === 'range') {
        const lines: string[] = []
        lines.push(`ZIWA RHINO AND WILDLIFE RANCH`)
        lines.push(`Report Summary: ${formatDateReadable(body.from)} — ${formatDateReadable(body.to)}`)
        lines.push(`Total reports: ${reports.length}`)
        lines.push('')
        lines.push('═'.repeat(50))

        const byDept = new Map<string, typeof reports>()
        for (const r of reports) {
          const dept = r.hod_departments as unknown as { name: string; slug: string }
          const key = dept.name
          if (!byDept.has(key)) byDept.set(key, [])
          byDept.get(key)!.push(r)
        }

        for (const [deptName, deptReports] of byDept) {
          lines.push('')
          lines.push(`${deptName.toUpperCase()} (${deptReports.length} reports)`)
          lines.push('─'.repeat(40))

          for (const r of deptReports) {
            const dept = r.hod_departments as unknown as { name: string; slug: string }
            const data = r.report_data as Record<string, unknown>
            const challenges = String(data?.challenges_successes ?? '').trim()
            const status = getSubmissionStatus(r.submitted_at as string, r.report_date as string)

            lines.push(`  ${r.report_date} — by ${r.submitted_by}${status !== 'on_time' ? ` [${getStatusLabel(status)}]` : ''}`)
            if (challenges.length > 3) {
              lines.push(`    Notes: ${challenges}`)
            }

            const formConfig = getFormBySlug(dept.slug)
            if (formConfig && data) {
              const metrics = extractKeyMetrics(data, formConfig)
              if (metrics.length > 0) {
                const metricStr = metrics.slice(0, 5).map((m) => `${m.label}: ${m.value}`).join(', ')
                lines.push(`    Key metrics: ${metricStr}`)
              }
            }
          }
        }

        const { data: allDepts } = await supabase
          .from('hod_departments')
          .select('name')
          .eq('is_active', true)

        const reportedDepts = new Set(byDept.keys())
        const missing = (allDepts ?? []).filter((d) => !reportedDepts.has(d.name)).map((d) => d.name)

        if (missing.length > 0 && !body.department_ids) {
          lines.push('')
          lines.push('DEPARTMENTS WITH NO REPORTS')
          lines.push(missing.join(', '))
        }

        const lateCount = reports.filter((r) =>
          getSubmissionStatus(r.submitted_at as string, r.report_date as string) === 'late'
        ).length
        const complianceRate = Math.round(((reports.length - lateCount) / reports.length) * 100)

        lines.push('')
        lines.push('═'.repeat(50))
        lines.push(`Compliance: ${complianceRate}% on time (${lateCount} late submissions)`)
        lines.push(`Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })}`)

        return NextResponse.json({ content: lines.join('\n'), type: 'range', format: 'text' })
      }

      if (body.type === 'summary') {
        const departmentNotes: string[] = []
        const allMetrics: DepartmentMetrics[] = []

        for (const r of reports) {
          const data = r.report_data as Record<string, unknown> | null
          if (!data) continue
          const dept = r.hod_departments as unknown as { name: string; slug: string }
          const challenges = String(data.challenges_successes ?? '').trim()
          if (challenges.length > 3) {
            departmentNotes.push(`[${r.report_date}] ${dept.name}: ${challenges}`)
          }

          const formConfig = getFormBySlug(dept.slug)
          if (formConfig) {
            const metrics = extractKeyMetrics(data, formConfig)
            if (metrics.length > 0) {
              allMetrics.push({
                department: dept.name,
                slug: dept.slug,
                reportDate: r.report_date as string,
                metrics,
              })
            }
          }
        }

        const metricsText = formatMetricsForPrompt(allMetrics)

        const lateCount = reports.filter((r) =>
          getSubmissionStatus(r.submitted_at as string, r.report_date as string) === 'late'
        ).length

        const deptCount = new Set(reports.map((r) => {
          const d = r.hod_departments as unknown as { name: string }
          return d.name
        })).size
        const compliancePct = Math.round(((reports.length - lateCount) / reports.length) * 100)

        let aiContent: string | null = null
        try {
          const result = await callOpenRouter({
            messages: [
              {
                role: 'system',
                content: `You are an executive briefing writer at Ziwa Rhino And Wildlife Ranch in Uganda. You produce executive summaries for the Chairman, CEO, and Managing Director.

Write in simple, clear British English. This document will be shared externally — make it professional but readable.

Structure:
EXECUTIVE SUMMARY
3-4 sentences covering the overall picture: total reports, compliance rate, standout events.

DEPARTMENT HIGHLIGHTS
One line per department with something notable. Skip quiet departments.

KEY METRICS
Reference any significant numbers from the data.

ISSUES AND ACTIONS
Numbered list of items requiring management attention, with recommended actions.

CROSS-DEPARTMENT OBSERVATIONS
Any correlations or discrepancies between departments worth noting.

Rules: Plain text only — no markdown formatting. Be factual. No filler. Complete every section.`,
              },
              {
                role: 'user',
                content: `Executive summary for ${formatDateReadable(body.from)} to ${formatDateReadable(body.to)}.
${reports.length} reports from ${deptCount} departments. ${lateCount} late submissions.

NOTES:
${departmentNotes.length > 0 ? departmentNotes.join('\n') : 'No substantive notes.'}

METRICS:
${metricsText || 'No numeric data.'}`,
              },
            ],
            maxTokens: 1500,
            referer: 'https://hod-admin-portal.netlify.app',
            title: 'HOD Executive Summary Export',
          })
          aiContent = result.content
        } catch (aiErr) {
          console.error('Executive summary AI failed, using text-only fallback:', aiErr instanceof Error ? aiErr.message : aiErr)
        }

        const lines: string[] = []
        lines.push('ZIWA RHINO AND WILDLIFE RANCH')
        lines.push(`Executive Summary: ${formatDateReadable(body.from)} — ${formatDateReadable(body.to)}`)
        lines.push(`Reports: ${reports.length} | Departments: ${deptCount} | Late: ${lateCount} | Compliance: ${compliancePct}%`)
        lines.push('')
        lines.push('═'.repeat(50))
        lines.push('')

        if (aiContent) {
          lines.push(aiContent)
        } else {
          lines.push('AI-generated analysis is temporarily unavailable. Key data follows.')
          lines.push('')
          if (departmentNotes.length > 0) {
            lines.push('DEPARTMENT NOTES')
            for (const note of departmentNotes) lines.push(note)
            lines.push('')
          }
          if (metricsText) {
            lines.push('KEY METRICS')
            lines.push(metricsText)
          }
        }

        lines.push('')
        lines.push('═'.repeat(50))
        lines.push(`Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })}`)

        return NextResponse.json({ content: lines.join('\n'), type: 'summary', format: 'text' })
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Export generation failed:', errMsg)
    return NextResponse.json({ error: `Export generation failed: ${errMsg.slice(0, 200)}` }, { status: 500 })
  }
}
