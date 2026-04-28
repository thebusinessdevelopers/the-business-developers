import { NextResponse, NextRequest } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const id = request.nextUrl.pathname.split('/').pop()
  const supabase = createServerClient()

  const { data: meeting, error } = await supabase
    .from('hod_meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const { data: actionItems } = await supabase
    .from('hod_meeting_action_items')
    .select('*, assigned_dept:hod_departments(name, slug), assigned_user:hod_users!hod_meeting_action_items_assigned_user_id_fkey(hod_name)')
    .eq('meeting_id', id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  return NextResponse.json({ meeting, actionItems: actionItems ?? [] })
})

export const PUT = withAdminAuth(async ({ admin, request }) => {
  const id = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()
  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('hod_meetings')
    .select('id, date, meeting_type, status')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const meetingUpdate: Record<string, unknown> = {
    meeting_type: body.meeting_type,
    special_title: body.special_title || null,
    date: body.date,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    secretary_user_id: body.secretary_user_id || null,
    secretary_custom_name: body.secretary_custom_name || null,
    attendance: body.attendance || [],
    additional_attendees: body.additional_attendees || [],
    agenda: body.agenda || [],
    general_notes: body.general_notes || null,
    per_hod_notes: body.per_hod_notes || {},
    decisions: body.decisions || [],
    suggested_next_date: body.suggested_next_date || null,
    closing_notes: body.closing_notes || null,
  }

  const { error } = await supabase
    .from('hod_meetings')
    .update(meetingUpdate)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.action_items && Array.isArray(body.action_items)) {
    const existingItemIds = (body.action_items as Array<{ id?: string }>)
      .filter(ai => ai.id)
      .map(ai => ai.id!)

    if (existingItemIds.length > 0) {
      await supabase
        .from('hod_meeting_action_items')
        .delete()
        .eq('meeting_id', id!)
        .not('id', 'in', `(${existingItemIds.join(',')})`)
    } else {
      await supabase
        .from('hod_meeting_action_items')
        .delete()
        .eq('meeting_id', id!)
    }

    const updates: Promise<unknown>[] = []
    const newItems: Array<Record<string, unknown>> = []

    for (const ai of body.action_items as Array<Record<string, unknown>>) {
      const payload = {
        description: ai.description,
        assignee_type: ai.assignee_type,
        assigned_dept_id: ai.assigned_dept_id || null,
        assigned_sub_dept: ai.assigned_sub_dept || null,
        assigned_user_id: ai.assigned_user_id || null,
        deadline: ai.deadline || null,
        priority: ai.priority || 'medium',
      }
      if (ai.id) {
        updates.push(Promise.resolve(supabase.from('hod_meeting_action_items').update(payload).eq('id', ai.id as string)))
      } else if ((ai.description as string)?.trim()) {
        newItems.push({ meeting_id: id, ...payload })
      }
    }

    if (newItems.length > 0) updates.push(Promise.resolve(supabase.from('hod_meeting_action_items').insert(newItems)))
    if (updates.length > 0) await Promise.all(updates)
  }

  await logAdminActivity(admin.id, 'meeting_edited', {
    meeting_id: id,
    meeting_type: body.meeting_type,
    date: body.date,
    previous_date: existing.date,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, { capability: 'meeting_manage' })

export const DELETE = withAdminAuth(async ({ admin, request }) => {
  const id = request.nextUrl.pathname.split('/').pop()
  const supabase = createServerClient()

  const { data: meeting } = await supabase
    .from('hod_meetings')
    .select('id, date, meeting_type')
    .eq('id', id)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('hod_meetings')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await Promise.resolve(
    supabase
      .from('hod_notifications')
      .delete()
      .like('batch_key', `meeting:${id}%`)
  ).catch((err) => console.error('Failed to clean up meeting notifications:', err))

  await logAdminActivity(admin.id, 'meeting_deleted', {
    meeting_id: id,
    meeting_type: meeting.meeting_type,
    date: meeting.date,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, { capability: 'meeting_manage' })
