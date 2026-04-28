'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { LOGIN_DEPARTMENTS, type LoginDepartment, type LoginUser } from '@/config/login-users'
import GlobalMessageBanner from './GlobalMessageBanner'

type Step = 'department' | 'name' | 'password' | 'guest-name'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [step, setStep] = useState<Step>('department')
  const [selectedDept, setSelectedDept] = useState<LoginDepartment | null>(null)
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null)
  const [password, setPassword] = useState('')
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleDepartmentSelect(dept: LoginDepartment) {
    setSelectedDept(dept)
    setError('')

    if (dept.users.length === 1) {
      setSelectedUser(dept.users[0])
      setStep('password')
    } else {
      setStep('name')
    }
  }

  function handleNameSelect(user: LoginUser) {
    setSelectedUser(user)
    setError('')
    setStep('password')
  }

  function handleSomeoneElse() {
    setSelectedUser(null)
    setError('')
    setGuestName('')
    setStep('guest-name')
  }

  function handleBack() {
    setError('')
    setPassword('')
    setGuestName('')

    if (step === 'guest-name') {
      if (selectedDept && selectedDept.users.length > 1) {
        setStep('name')
      } else {
        setSelectedDept(null)
        setStep('department')
      }
      return
    }

    if (step === 'password' && selectedDept && selectedDept.users.length > 1) {
      setSelectedUser(null)
      setStep('name')
    } else {
      setSelectedDept(null)
      setSelectedUser(null)
      setStep('department')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          password,
          device_info: {
            user_agent: navigator.userAgent,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            platform: navigator.platform,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed.')
        setSubmitting(false)
        return
      }

      window.location.href = redirect || data.redirectTo || '/'
    } catch {
      setError('Unable to connect. Please check your internet and try again.')
      setSubmitting(false)
    }
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDept || !guestName.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_slug: selectedDept.slug,
          guest_name: guestName.trim(),
          device_info: {
            user_agent: navigator.userAgent,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            platform: navigator.platform,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }

      window.location.href = data.redirectTo || '/'
    } catch {
      setError('Unable to connect. Please check your internet and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-md">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Ziwa Rhino And Wildlife Ranch"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ziwa Rhino And Wildlife Ranch</h1>
            <p className="text-sm text-gray-500">Daily Report Portal</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Department picker */}
        {step === 'department' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Select your department</p>
            <div className="grid grid-cols-2 gap-2">
              {LOGIN_DEPARTMENTS.map((dept) => (
                <button
                  key={dept.slug}
                  type="button"
                  onClick={() => handleDepartmentSelect(dept)}
                  className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-ziwa-400 hover:bg-ziwa-50 transition-colors text-sm font-medium text-gray-800"
                >
                  {dept.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Name picker */}
        {step === 'name' && selectedDept && (
          <div>
            <button type="button" onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3">
              <span>&larr;</span> Back
            </button>
            <p className="text-sm font-medium text-gray-700 mb-3">
              {selectedDept.label} &mdash; who are you?
            </p>
            <div className="grid grid-cols-1 gap-2">
              {selectedDept.users.map((user) => (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => handleNameSelect(user)}
                  className="text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-ziwa-400 hover:bg-ziwa-50 transition-colors text-sm font-semibold text-gray-800"
                >
                  {user.displayName}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSomeoneElse}
                className="text-left px-4 py-3 rounded-lg border border-dashed border-gray-300 hover:border-ziwa-400 hover:bg-ziwa-50 transition-colors text-sm text-gray-500 italic"
              >
                Someone else
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Password */}
        {step === 'password' && selectedDept && selectedUser && (
          <div>
            <button type="button" onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3">
              <span>&larr;</span> Change
            </button>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-gray-900">{selectedUser.displayName}</p>
              <p className="text-xs text-gray-500">{selectedDept.label}</p>
            </div>
            {selectedDept.users.length === 1 && (
              <button
                type="button"
                onClick={handleSomeoneElse}
                className="text-xs text-gray-400 hover:text-ziwa-600 mb-4 block"
              >
                Not {selectedUser.displayName}? <span className="underline">Someone else</span>
              </button>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
                  placeholder="Enter your password"
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
          </div>
        )}

        {/* Step 4: Guest name entry */}
        {step === 'guest-name' && selectedDept && (
          <div>
            <button type="button" onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3">
              <span>&larr;</span> Back
            </button>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-gray-500">{selectedDept.label}</p>
            </div>
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your name
                </label>
                <input
                  id="guest-name"
                  type="text"
                  autoFocus
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !guestName.trim()}
                className="w-full bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {submitting ? 'Continuing...' : 'Continue'}
              </button>
            </form>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 pb-6">
        Ziwa Rhino And Wildlife Ranch &middot; Daily Reporting System
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <GlobalMessageBanner />
      <Suspense fallback={
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md w-full text-center text-gray-400 text-sm">
          Loading...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
