import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * Public endpoint (no auth) — returns @everyone / @admins messages
 * from the last 24 hours for display on the login page.
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: messages, error } = await supabase
      .from('hod_report_threads')
      .select(`
        id, body, mentions, created_at,
        author:hod_users!author_user_id(hod_name, role, admin_title)
      `)
      .gte('created_at', cutoff)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch global messages error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const globalMessages = (messages ?? [])
      .filter(msg => {
        const mentions = msg.mentions as Array<{ type: string; group?: string }> | null
        return mentions?.some(
          m => m.type === 'group' && (m.group === 'everyone' || m.group === 'admins')
        )
      })
      .map(msg => {
        const author = msg.author as unknown as {
          hod_name: string; role: string; admin_title: string | null
        } | null
        return {
          id: msg.id,
          body: msg.body,
          created_at: msg.created_at,
          author_name: author?.hod_name ?? 'Unknown',
          author_title: author?.admin_title ?? null,
        }
      })

    return NextResponse.json({ messages: globalMessages })
  } catch (err) {
    console.error('Global messages error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
