'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChangeDateButtonProps {
  reportId: string
  currentDate: string
}

export default function ChangeDateButton({ reportId, currentDate }: ChangeDateButtonProps) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [newDate, setNewDate] = useState(currentDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (newDate === currentDate) {
      setError('Please select a different date.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/change-report-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, newDate }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to change date')
        return
      }

      setShowPicker(false)
      router.refresh()
    } catch {
      setError('Failed to change date. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="text-xs text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
      >
        Change date
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={newDate}
        onChange={(e) => { setNewDate(e.target.value); setError(null) }}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ziwa-500"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="text-xs bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-medium rounded-md px-3 py-1.5 transition-colors"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={() => { setShowPicker(false); setError(null); setNewDate(currentDate) }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </div>
  )
}
