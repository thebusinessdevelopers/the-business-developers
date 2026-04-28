import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import type { MentionData } from '@hod/shared/types'

export const POST = withAdminAuth(async ({ admin, request }) => {
    const { reportId, reviewedBy, reviewComments, mentions } = await request.json() as {
      reportId: string
      reviewedBy: string
      reviewComments: string | null
      mentions?: MentionData[]
    }

    if (!reportId || !reviewedBy) {
      return NextResponse.json({ error: 'reportId and reviewedBy are required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('hod_daily_reports')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: reviewedBy,
        review_comments: reviewComments || null,
      })
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (mentions && mentions.length > 0 && reviewComments) {
      const preview = reviewComments.slice(0, 120)
      const notifiedUserIds = new Set<string>()

      const notifications: Array<{
        recipient_user_id: string
        type: string
        source_report_id: string
        triggered_by_user_id: string
        body_preview: string
        batch_key: string
      }> = []
      const batchKey = `report:${reportId}`

      const deptIds = mentions.filter(m => m.type === 'department' && m.department_id).map(m => m.department_id!)
      const hasGroupMention = mentions.some(m => m.type === 'group')
      const hasAdminGroup = mentions.some(m => m.type === 'group' && m.group === 'admins')

      const lookups: Promise<{ data: { id: string; department_id?: string }[] | null }>[] = []
      if (deptIds.length > 0) {
        lookups.push(Promise.resolve(supabase.from('hod_users').select('id, department_id').in('department_id', deptIds)) as Promise<{ data: { id: string; department_id?: string }[] | null }>)
      }
      if (hasGroupMention) {
        let q = supabase.from('hod_users').select('id')
        if (hasAdminGroup) q = q.eq('role', 'admin')
        lookups.push(Promise.resolve(q) as Promise<{ data: { id: string; department_id?: string }[] | null }>)
      }

      const lookupResults = lookups.length > 0 ? await Promise.all(lookups) : []
      const deptUserMap = new Map<string, string[]>()
      const groupUsers: string[] = []

      if (deptIds.length > 0 && lookupResults[0]?.data) {
        for (const u of lookupResults[0].data) {
          if (u.department_id) {
            const list = deptUserMap.get(u.department_id) || []
            list.push(u.id)
            deptUserMap.set(u.department_id, list)
          }
        }
      }
      if (hasGroupMention) {
        const idx = deptIds.length > 0 ? 1 : 0
        if (lookupResults[idx]?.data) {
          for (const u of lookupResults[idx].data) groupUsers.push(u.id)
        }
      }

      for (const mention of mentions) {
        if (mention.type === 'user' && mention.user_id) {
          if (mention.user_id === admin.id || notifiedUserIds.has(mention.user_id)) continue
          notifiedUserIds.add(mention.user_id)
          notifications.push({
            recipient_user_id: mention.user_id,
            type: 'review_comment',
            source_report_id: reportId,
            triggered_by_user_id: admin.id,
            body_preview: preview,
            batch_key: batchKey,
          })
        } else if (mention.type === 'department' && mention.department_id) {
          for (const uid of deptUserMap.get(mention.department_id) || []) {
            if (uid === admin.id || notifiedUserIds.has(uid)) continue
            notifiedUserIds.add(uid)
            notifications.push({
              recipient_user_id: uid,
              type: 'review_comment',
              source_report_id: reportId,
              triggered_by_user_id: admin.id,
              body_preview: preview,
              batch_key: batchKey,
            })
          }
        } else if (mention.type === 'group') {
          for (const uid of groupUsers) {
            if (uid === admin.id || notifiedUserIds.has(uid)) continue
            notifiedUserIds.add(uid)
            notifications.push({
              recipient_user_id: uid,
              type: 'review_comment',
              source_report_id: reportId,
              triggered_by_user_id: admin.id,
              body_preview: preview,
              batch_key: batchKey,
            })
          }
        }
      }

      if (notifications.length > 0) {
        await Promise.resolve(supabase.from('hod_notifications').insert(notifications)).catch(() => {})
      }
    }

    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('submitted_by_user_id')
      .eq('id', reportId)
      .single()

    if (report?.submitted_by_user_id && report.submitted_by_user_id !== admin.id) {
      const alreadyNotified = mentions?.some(
        (m) => m.type === 'user' && m.user_id === report.submitted_by_user_id
      )
      if (!alreadyNotified) {
        await Promise.resolve(supabase.from('hod_notifications').insert({
          recipient_user_id: report.submitted_by_user_id,
          type: 'review_comment',
          source_report_id: reportId,
          triggered_by_user_id: admin.id,
          body_preview: reviewComments?.slice(0, 120) ?? `Report reviewed by ${reviewedBy}`,
          batch_key: `report:${reportId}`,
        })).catch(() => {})
      }
    }

    await logAdminActivity(admin.id, 'report_reviewed', {
      report_id: reportId,
      reviewed_by: reviewedBy,
      admin_title: admin.admin_title,
      has_comments: Boolean(reviewComments),
      mention_count: mentions?.length ?? 0,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
}, { capability: 'report_manage' })
