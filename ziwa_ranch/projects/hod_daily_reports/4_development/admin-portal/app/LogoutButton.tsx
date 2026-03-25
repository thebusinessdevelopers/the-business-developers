'use client'

import { logoutAction } from './actions'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="text-gray-400 hover:text-gray-600">
        Sign out
      </button>
    </form>
  )
}
