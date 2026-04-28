import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { canAccessDepartment } from '@/lib/department-access'

export const POST = withAuth(async ({ user, guest, request }) => {
  try {
    const body = await request.json()
    const { department_id, submitted_by, report_date, error_code, error_message, error_context } = body as {
      department_id?: string
      submitted_by?: string
      report_date?: string
      error_code?: string
      error_message?: string
      error_context?: Record<string, unknown>
    }

    if (!error_message) {
      return NextResponse.json({ error: 'error_message is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    if (department_id) {
      const { data: dept } = await supabase
        .from('hod_departments')
        .select('id, slug')
        .eq('id', department_id)
        .single()
      if (!dept || !canAccessDepartment({ user, guest }, { id: dept.id, slug: dept.slug })) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    await supabase.from('hod_error_log').insert({
      department_id: department_id || null,
      submitted_by: submitted_by || user?.hod_name || guest?.name || null,
      report_date: report_date || null,
      error_code: error_code || null,
      error_message,
      error_context: error_context || {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 })
  }
}, { allowGuest: true })
