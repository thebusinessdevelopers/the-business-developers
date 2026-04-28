import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { processMessageMentions } from '@hod/shared/lib/mentions'
import type { MentionData } from '@/types'

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

export const GET = withAdminAuth(async ({ request }) => {
  const reportId = request.nextUrl.pathname.split('/').pop()
  if (!reportId) {
    return NextResponse.json({ error: 'Missing report ID' }, { status: 400 })
  }

  const supabase = createServerClient()

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
}, { capability: 'report_view' })

export const POST = withAdminAuth(async ({ admin, request }) => {
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

  const { data: message, error } = await supabase
    .from('hod_report_threads')
    .insert({
      report_id: reportId,
      parent_id: parent_id || null,
      author_user_id: admin.id,
      body: body.trim(),
      mentions,
      is_admin_note: true,
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
    authorUserId: admin.id,
    body: body.trim(),
    mentions,
    parentId: parent_id || null,
    isAdminNote: true,
  }).catch(err => console.error('Mention processing failed:', err))

  logAdminActivity(admin.id, 'thread_message_posted', {
    report_id: reportId,
    thread_id: message.id,
    admin_title: admin.admin_title,
    has_mentions: mentions.length > 0,
  }).catch(() => {})

  return NextResponse.json({ id: message.id })
}, { capability: 'report_manage' })
