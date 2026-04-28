import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async () => {
  const supabase = createServerClient()

  const [usersResult, departmentsResult] = await Promise.all([
    supabase
      .from('hod_users')
      .select('id, hod_name, username, role, admin_tier, admin_title, department_id')
      .order('hod_name'),
    supabase
      .from('hod_departments')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (usersResult.error || departmentsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const users = usersResult.data ?? []
  const departments = departmentsResult.data ?? []

  const management = users
    .filter(u => u.role === 'admin')
    .map(u => ({
      id: u.id,
      hod_name: u.hod_name,
      username: u.username,
      role: u.role as 'hod' | 'admin',
      admin_title: u.admin_title as string | null,
    }))

  const departmentGroups = departments.map(dept => ({
    label: dept.name,
    type: 'department' as const,
    department_id: dept.id,
    users: users
      .filter(u => u.department_id === dept.id && u.role === 'hod')
      .map(u => ({
        id: u.id,
        hod_name: u.hod_name,
        username: u.username,
        role: u.role as 'hod' | 'admin',
        admin_title: null as string | null,
      })),
  })).filter(g => g.users.length > 0)

  return NextResponse.json({
    groups: [
      { label: 'Senior Management', type: 'management' as const, users: management },
      ...departmentGroups,
    ],
    special: [
      { key: 'everyone', label: 'Everyone' },
      { key: 'admins', label: 'Admins' },
    ],
  })
}, { capability: 'report_view' })
