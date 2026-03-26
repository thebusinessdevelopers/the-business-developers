import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth, getAdminUser, logAdminActivity } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { EditHistoryEntry } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const admin = await getAdminUser()

    const body = await request.json()
    const { reportId, reportData, editorName } = body as {
      reportId: string
      reportData: Record<string, unknown>
      editorName?: string
    }

    if (!reportId || !reportData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: existing } = await supabase
      .from('hod_daily_reports')
      .select('id, report_data, edit_history, department_id, report_date')
      .eq('id', reportId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const prevData = existing.report_data as Record<string, unknown>
    const changes: { field: string; old_value: unknown; new_value: unknown }[] = []

    const allKeys = new Set([...Object.keys(prevData), ...Object.keys(reportData)])
    for (const key of allKeys) {
      const oldVal = prevData[key]
      const newVal = reportData[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, old_value: oldVal, new_value: newVal })
      }
    }

    if (changes.length === 0) {
      return NextResponse.json({ reportId, noChanges: true })
    }

    const prevHistory = (existing.edit_history as EditHistoryEntry[] | null) ?? []
    const now = new Date().toISOString()
    const editor = editorName || admin?.hod_name || 'Admin'

    const newEntry: EditHistoryEntry = {
      edited_by: editor,
      edited_at: now,
      changes,
    }

    const { error: updateError } = await supabase
      .from('hod_daily_reports')
      .update({
        report_data: reportData,
        edited_at: now,
        last_edited_by: editor,
        edit_history: [...prevHistory, newEntry],
        acknowledged_at: null,
        acknowledged_by: null,
        review_comments: null,
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Admin edit report DB error:', updateError)
      return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 })
    }

    const { data: harvestRoute } = await supabase
      .from('hod_departments')
      .select('slug')
      .eq('id', existing.department_id)
      .single()

    if (harvestRoute) {
      const origin = request.nextUrl.origin
      fetch(`${origin}/api/harvest-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      }).catch(() => {})
    }

    if (admin) {
      await logAdminActivity(admin.id, 'report_edited', {
        report_id: reportId,
        department_id: existing.department_id,
        report_date: existing.report_date,
        edited_by: editor,
        admin_title: admin.admin_title,
        source: 'admin_portal',
        fields_changed: changes.map((c) => c.field),
        ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      }).catch(() => {})
    }

    return NextResponse.json({ reportId })
  } catch (err: unknown) {
    const errObj = err as { message?: string } | null
    console.error('Admin edit report error:', errObj)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
