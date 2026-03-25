'use client'

import { useState } from 'react'
import { loginAction } from './actions'

export function LoginForm() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
          placeholder="Enter admin password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
