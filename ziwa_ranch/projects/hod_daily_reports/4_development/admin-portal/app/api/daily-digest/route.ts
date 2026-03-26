import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { getHfClient } from '@/lib/hf'

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
    .select('report_data, department_id')
    .eq('report_date', today)

  if (!reports || reports.length === 0) {
    return NextResponse.json({ digest: null, report_count: 0 })
  }

  const notes: string[] = []
  for (const r of reports) {
    const data = r.report_data as Record<string, unknown> | null
    if (!data) continue
    const text = String(data.challenges_successes ?? '').trim()
    if (text.length > 5) notes.push(text)
  }

  if (notes.length === 0) {
    return NextResponse.json({ digest: null, report_count: reports.length })
  }

  const combined = notes.join('\n---\n')

  try {
    const hf = getHfClient()
    const result = await hf.summarization({
      model: 'facebook/bart-large-cnn',
      inputs: combined.slice(0, 4000),
      parameters: {
        max_length: 120,
        min_length: 30,
      },
    })

    return NextResponse.json({
      digest: result.summary_text ?? null,
      report_count: reports.length,
      notes_count: notes.length,
    })
  } catch (err) {
    console.error('Daily digest summarisation failed:', err)
    return NextResponse.json({
      digest: null,
      report_count: reports.length,
      notes_count: notes.length,
      error: 'Summarisation unavailable',
    })
  }
}
