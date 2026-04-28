import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/auth'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { processMessageMentions } from '@hod/shared/lib/mentions'
import type { MentionData } from '@/types'

async function checkThreadAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  reportId: string
): Promise<{ allowed: boolean; reportExists: boolean }> {
  const { data: report } = await supabase
    .from('hod_daily_reports')
    .select('submitted_by_user_id')
    .eq('id', reportId)
    .single()

  if (!report) return { allowed: false, reportExists: false }
  if (report.submitted_by_user_id === userId) return { allowed: true, reportExists: true }

  const { count } = await supabase
    .from('hod_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('source_report_id', reportId)

  return { allowed: (count ?? 0) > 0, reportExists: true }
}

function formatThreadMessages(messages: Record<string, unknown>[]) {
  return messages.map(msg => {
    const authorRaw = msg.author as unknown as {
      id: string; hod_name: string; username: string; role: string
      admin_title: string | null; department: { name: string } | null
    } | null
    return {
      ...msg,
      author: authorRaw ? {
        id: authorRaw.id,
        hod_name: authorRaw.hod_name,
        username: authorRaw.username,
        role: authorRaw.role,
        admin_title: authorRaw.admin_title,
        department_name: authorRaw.department?.name ?? null,
      } : null,
    }
  })
}

export const GET = withAuth(async ({ userId, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const reportId = request.nextUrl.pathname.split('/').pop()
  if (!reportId) {
    return NextResponse.json({ error: 'Missing report ID' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { allowed, reportExists } = await checkThreadAccess(supabase, userId, reportId)

  if (!reportExists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }
  if (!allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { data: messages, error } = await supabase
    .from('hod_report_threads')
    .select(`
      id, report_id, parent_id, author_user_id, body, mentions,
      is_admin_note, created_at, edited_at, deleted_at,
      author:hod_users!author_user_id(id, hod_name, username, role, admin_title, department:hod_departments(name))
    `)
    .eq('report_id', reportId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch threads error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return NextResponse.json({
    messages: formatThreadMessages((messages ?? []) as Record<string, unknown>[]),
  })
})

export const POST = withAuth(async ({ userId, user, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const reportId = request.nextUrl.pathname.split('/').pop()
  if (!reportId) {
    return NextResponse.json({ error: 'Missing report ID' }, { status: 400 })
  }

  const { body, mentions = [], parent_id = null } = await request.json() as {
    body: string
    mentions?: MentionData[]
    parent_id?: string | null
  }

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { allowed, reportExists } = await checkThreadAccess(supabase, userId, reportId)

  if (!reportExists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }
  if (!allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const isAdmin = user?.role === 'admin'

  const { data: message, error } = await supabase
    .from('hod_report_threads')
    .insert({
      report_id: reportId,
      parent_id: parent_id || null,
      author_user_id: userId,
      body: body.trim(),
      mentions,
      is_admin_note: isAdmin,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Insert thread error:', error)
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 })
  }

  processMessageMentions({
    supabase,
    threadId: message.id,
    reportId,
    authorUserId: userId,
    body: body.trim(),
    mentions,
    parentId: parent_id || null,
    isAdminNote: isAdmin,
  }).catch(err => console.error('Mention processing failed:', err))

  logActivity(userId, 'thread_message_posted', {
    report_id: reportId,
    thread_id: message.id,
    has_mentions: mentions.length > 0,
  }).catch(() => {})

  return NextResponse.json({ id: message.id })
})
