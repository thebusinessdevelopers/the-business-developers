export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import PasswordResetForm from './PasswordResetForm'

interface HodUser {
  id: string
  username: string
  hod_name: string
  role: string
  hod_departments: { name: string } | null
}

export default async function UsersPage() {
  const supabase = createServerClient()

  const { data: users } = await supabase
    .from('hod_users')
    .select('id, username, hod_name, role, hod_departments(name)')
    .order('username')

  const hodUsers = (users ?? []) as unknown as HodUser[]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">HOD Users</h1>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {hodUsers.map((user) => (
          <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{user.hod_name}</p>
              <p className="text-xs text-gray-500">
                {user.username} &middot; {user.hod_departments?.name ?? user.role}
              </p>
            </div>
            <PasswordResetForm userId={user.id} userName={user.hod_name} />
          </div>
        ))}
      </div>
    </div>
  )
}
