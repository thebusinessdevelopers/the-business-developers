import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ChangePasswordForm from './ChangePasswordForm'

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Account</h1>
      <p className="text-sm text-gray-500 mb-6">
        Signed in as <span className="font-medium text-gray-700">{user.hod_name}</span>
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
