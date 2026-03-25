'use client'

import { useState } from 'react'

interface StockActionsProps {
  entryId: string
  currentStatus: string
}

export default function StockActions({ entryId, currentStatus }: StockActionsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const updateData: Record<string, unknown> = { status: newStatus }
      if (notes.trim()) updateData.admin_notes = notes.trim()

      await supabase
        .from('hod_verified_stock')
        .update(updateData)
        .eq('id', entryId)

      setStatus(newStatus)
      setShowNotes(false)
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'approved') {
    return <p className="text-xs text-green-600">Approved</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading}
          className="text-xs text-green-700 font-medium border border-green-300 rounded-md px-3 py-1.5 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => setShowNotes(!showNotes)}
          disabled={loading}
          className="text-xs text-red-600 font-medium border border-red-300 rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Flag
        </button>
      </div>

      {showNotes && (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for flagging..."
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <button
            onClick={() => updateStatus('flagged')}
            disabled={loading || !notes.trim()}
            className="text-xs text-white bg-red-600 hover:bg-red-700 font-medium rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Submit flag'}
          </button>
        </div>
      )}
    </div>
  )
}
