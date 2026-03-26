import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, logActivity } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { EditHistoryEntry } from '@/types'

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    const guestRaw = cookieStore.get(GUEST_COOKIE)?.value

    let userId: string | null = null
    let editorName: string | null = null

    if (sessionToken) {
      const user = await validateSession(sessionToken)
      if (!user) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      userId = user.id
      editorName = user.hod_name
    } else if (guestRaw) {
      try {
        const guest = JSON.parse(guestRaw) as { slug: string; name: string; ts: number }
        editorName = guest.name
      } catch {
        return NextResponse.json({ error: 'Invalid guest cookie' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { reportId, reportData, submittedBy } = body as {
      reportId: string
      reportData: Record<string, unknown>
      submittedBy: string
    }

    if (!reportId || !reportData || !submittedBy) {
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
    const newEntry: EditHistoryEntry = {
      edited_by: editorName ?? submittedBy,
      edited_at: now,
      changes,
    }

    const { error: updateError } = await supabase
      .from('hod_daily_reports')
      .update({
        report_data: reportData,
        edited_at: now,
        last_edited_by: editorName ?? submittedBy,
        edit_history: [...prevHistory, newEntry],
        acknowledged_at: null,
        acknowledged_by: null,
        review_comments: null,
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Edit report DB error:', updateError)
      return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 })
    }

    // Link any new photos
    const photoData = reportData.photos
    if (Array.isArray(photoData) && photoData.length > 0) {
      const mediaIds = photoData
        .map((p: Record<string, unknown>) => p.id)
        .filter(Boolean) as string[]
      if (mediaIds.length > 0) {
        Promise.resolve(
          supabase
            .from('hod_report_media')
            .update({ report_id: reportId })
            .in('id', mediaIds)
        ).catch(() => {})
      }
    }

    logActivity(userId, 'report_edited', {
      report_id: reportId,
      department_id: existing.department_id,
      report_date: existing.report_date,
      edited_by: editorName ?? submittedBy,
      fields_changed: changes.map((c) => c.field),
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({ reportId })
  } catch (err: unknown) {
    const errObj = err as { message?: string } | null
    console.error('Edit report error:', errObj)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
