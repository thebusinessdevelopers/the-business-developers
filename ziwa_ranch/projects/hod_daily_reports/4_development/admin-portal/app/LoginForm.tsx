'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

const ADMIN_ACCOUNTS = [
  { username: 'admin.md', label: 'MD', title: 'Managing Director' },
  { username: 'admin.gm', label: 'GM', title: 'General Manager' },
  { username: 'admin.ceo', label: 'CEO', title: 'Chief Executive Officer' },
  { username: 'admin.chairman', label: 'Chairman', title: 'Chairman' },
  { username: 'admin.isaac', label: 'Isaac', title: 'Head Office Manager' },
  { username: 'admin.wycliffe', label: 'Wycliffe', title: 'Staff Manager' },
  { username: 'admin.royfamily', label: 'Roy Family', title: 'View-only Family Access' },
]

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          Sign in as
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_ACCOUNTS.map((acc) => (
            <label
              key={acc.username}
              className="relative flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 cursor-pointer hover:border-ziwa-300 hover:bg-ziwa-50/50 transition-colors has-[:checked]:border-ziwa-400 has-[:checked]:bg-ziwa-50"
            >
              <input
                type="radio"
                name="username"
                value={acc.username}
                className="sr-only"
                required
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{acc.label}</p>
                <p className="text-xs text-gray-400 truncate">{acc.title}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
          placeholder="Enter password"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
