'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteReportButtonProps {
  reportId: string
  departmentName: string
}

export default function DeleteReportButton({ reportId, departmentName }: DeleteReportButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = input.trim().toLowerCase() === departmentName.trim().toLowerCase()

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/delete-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, departmentName: input.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete report')
        return
      }

      router.push('/reports')
      router.refresh()
    } catch {
      setError('Failed to delete report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 hover:text-red-700 font-medium border border-red-300 rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors"
      >
        Delete report
      </button>
    )
  }

  return (
    <div className="w-full mt-3 p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
      <p className="text-sm font-medium text-red-800">
        This will permanently delete this report. This cannot be undone.
      </p>
      <p className="text-xs text-red-700">
        Type <span className="font-bold">{departmentName}</span> to confirm.
      </p>
      <input
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(null) }}
        placeholder={departmentName}
        className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={!matches || loading}
          className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium rounded-md px-4 py-2 transition-colors"
        >
          {loading ? 'Deleting...' : 'Confirm delete'}
        </button>
        <button
          onClick={() => { setOpen(false); setInput(''); setError(null) }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
