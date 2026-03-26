import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter } from '@/lib/openrouter'

function getKampalaDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

export async function GET() {
  const authError = await verifyAdminAuth()
  if (authError) return authError

  const supabase = createServerClient()
  const today = getKampalaDateStr()

  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('report_data, department_id, hod_departments(name)')
    .eq('report_date', today)

  if (!reports || reports.length === 0) {
    return NextResponse.json({ digest: null, report_count: 0 })
  }

  const departmentNotes: string[] = []
  for (const r of reports) {
    const data = r.report_data as Record<string, unknown> | null
    if (!data) continue
    const text = String(data.challenges_successes ?? '').trim()
    const dept = r.hod_departments as unknown as { name: string } | { name: string }[] | null
    const deptName = (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown'
    if (text.length > 3) {
      departmentNotes.push(`${deptName}: ${text}`)
    }
  }

  if (departmentNotes.length === 0) {
    return NextResponse.json({
      digest: `${reports.length} department(s) reported today. No notable challenges or highlights were raised.`,
      report_count: reports.length,
      notes_count: 0,
    })
  }

  try {
    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You are an executive assistant at Ziwa Rhino And Wildlife Ranch in Uganda. You summarise daily department reports for the General Manager. Be concise, factual, and action-oriented. If a department says "nothing" or similar, treat it as all-clear — do not invent content. Highlight any items requiring action. Keep the summary under 150 words. Do not use markdown formatting.`,
        },
        {
          role: 'user',
          content: `Today's department notes (${reports.length} departments reported, ${departmentNotes.length} with content):\n\n${departmentNotes.join('\n\n')}`,
        },
      ],
      maxTokens: 300,
      reasoningEffort: 'medium',
    })

    return NextResponse.json({
      digest: result.content,
      report_count: reports.length,
      notes_count: departmentNotes.length,
    })
  } catch (err) {
    console.error('Daily digest failed:', err)
    return NextResponse.json({
      digest: null,
      report_count: reports.length,
      notes_count: departmentNotes.length,
      error: 'Summarisation unavailable',
    })
  }
}
