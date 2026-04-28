export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, isMdAdmin } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import PasswordResetForm from './PasswordResetForm'
import PasswordRevealButton from './PasswordRevealButton'

interface HodUser {
  id: string
  username: string
  hod_name: string
  role: string
  password_display: string | null
  hod_departments: { name: string } | null
}

export default async function UsersPage() {
  const admin = await getAdminUser()
  if (!admin || !isMdAdmin(admin)) {
    redirect('/')
  }
  const canResetPasswords = isMdAdmin(admin)

  const supabase = createServerClient()

  const { data: users } = await supabase
    .from('hod_users')
    .select('id, username, hod_name, role, password_display, hod_departments(name)')
    .order('username')

  const hodUsers = (users ?? []) as unknown as HodUser[]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">HOD Users</h1>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {canResetPasswords
          ? 'Passwords set since v2.9 are visible below. Use "Set temporary password" to reset a user\'s password.'
          : 'Only senior admins can view or set temporary passwords.'}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {hodUsers.map((user) => (
          <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{user.hod_name}</p>
              <p className="text-xs text-gray-500">
                {user.username} &middot; {user.hod_departments?.name ?? user.role}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {canResetPasswords && (
                <PasswordRevealButton passwordDisplay={user.password_display} />
              )}
              <PasswordResetForm
                userId={user.id}
                userName={user.hod_name}
                canResetPasswords={canResetPasswords}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
