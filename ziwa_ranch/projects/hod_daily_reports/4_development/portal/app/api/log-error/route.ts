import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { department_id, submitted_by, report_date, error_code, error_message, error_context } = body

    if (!error_message) {
      return NextResponse.json({ error: 'error_message is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    await supabase.from('hod_error_log').insert({
      department_id: department_id || null,
      submitted_by: submitted_by || null,
      report_date: report_date || null,
      error_code: error_code || null,
      error_message,
      error_context: error_context || {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 })
  }
}
