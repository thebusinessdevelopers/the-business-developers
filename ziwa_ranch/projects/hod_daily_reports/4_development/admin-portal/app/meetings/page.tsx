export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, hasAdminCapability } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import MeetingsClient from './MeetingsClient'

export default async function MeetingsPage() {
  const admin = await getAdminUser()
  if (!admin || !hasAdminCapability(admin, 'meeting_manage')) redirect('/')

  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug, hods')
    .eq('is_active', true)
    .order('sort_order')

  const { data: hodUsers } = await supabase
    .from('hod_users')
    .select('id, hod_name, username, department_id, role')
    .eq('role', 'hod')
    .eq('is_active', true)

  const { data: adminUsers } = await supabase
    .from('hod_users')
    .select('id, hod_name, username, admin_title')
    .eq('role', 'admin')

  return (
    <MeetingsClient
      adminId={admin.id}
      adminName={admin.hod_name}
      departments={departments ?? []}
      hodUsers={hodUsers ?? []}
      adminUsers={adminUsers ?? []}
    />
  )
}
