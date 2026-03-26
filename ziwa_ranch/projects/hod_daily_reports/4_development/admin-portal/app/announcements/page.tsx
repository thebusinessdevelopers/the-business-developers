export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import AnnouncementManager from './AnnouncementManager'

interface AnnouncementRow {
  id: string
  title: string
  body: string
  priority: string
  active: boolean
  department_id: string | null
  created_at: string
  expires_at: string | null
  hod_departments: { name: string } | null
}

interface DeptRow {
  id: string
  name: string
}

export default async function AnnouncementsPage() {
  const supabase = createServerClient()

  const { data: announcements } = await supabase
    .from('hod_announcements')
    .select('id, title, body, priority, active, department_id, created_at, expires_at, hod_departments(name)')
    .eq('active', true)
    .order('created_at', { ascending: false })

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Announcements</h1>
      <AnnouncementManager
        announcements={(announcements ?? []) as unknown as AnnouncementRow[]}
        departments={(departments ?? []) as DeptRow[]}
      />
    </div>
  )
}
