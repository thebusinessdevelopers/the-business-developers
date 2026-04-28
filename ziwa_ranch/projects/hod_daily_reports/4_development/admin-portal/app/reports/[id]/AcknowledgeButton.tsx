'use client'

import { useState, useEffect } from 'react'
import MentionInput from '@hod/shared/components/MentionInput'
import type { MentionData, MentionUserGroup } from '@hod/shared/types'

interface AcknowledgeButtonProps {
  reportId: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  reviewComments: string | null
}

const REVIEWER_OPTIONS = ['Managing Director', 'General Manager']

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AcknowledgeButton({
  reportId,
  acknowledgedAt,
  acknowledgedBy,
  reviewComments,
}: AcknowledgeButtonProps) {
  const [acked, setAcked] = useState(!!acknowledgedAt)
  const [ackedAt, setAckedAt] = useState(acknowledgedAt)
  const [ackedBy, setAckedBy] = useState(acknowledgedBy)
  const [savedComments, setSavedComments] = useState(reviewComments)

  const [showForm, setShowForm] = useState(false)
  const [selectedReviewer, setSelectedReviewer] = useState('')
  const [customReviewer, setCustomReviewer] = useState('')
  const [comments, setComments] = useState('')
  const [mentions, setMentions] = useState<MentionData[]>([])
  const [userGroups, setUserGroups] = useState<MentionUserGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (showForm && userGroups.length === 0) {
      fetch('/api/mention-users')
        .then((r) => r.json())
        .then((data) => {
          if (data.groups) setUserGroups(data.groups)
        })
        .catch(() => {})
    }
  }, [showForm, userGroups.length])

  const reviewerName = selectedReviewer === '__other__' ? customReviewer.trim() : selectedReviewer

  async function handleSubmitReview() {
    if (!reviewerName) {
      setError('Please select who is reviewing this report.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/review-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          reviewedBy: reviewerName,
          reviewComments: comments.trim() || null,
          mentions: mentions.length > 0 ? mentions : undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const now = new Date().toISOString()
      setAcked(true)
      setAckedAt(now)
      setAckedBy(reviewerName)
      setSavedComments(comments.trim() || null)
      setShowForm(false)
    } catch {
      setError('Failed to save review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (acked) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-800">
            Reviewed by {ackedBy}
          </span>
          <span className="text-xs text-green-600">
            {ackedAt && formatDateTime(ackedAt)}
          </span>
        </div>
        {savedComments && (
          <p className="text-sm text-green-700 pl-4 border-l-2 border-green-300">
            {savedComments}
          </p>
        )}
      </div>
    )
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-xs text-green-700 hover:text-green-800 font-medium border border-green-300 rounded-md px-3 py-1.5 hover:bg-green-50 transition-colors"
      >
        Mark as reviewed
      </button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Review this report</p>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Reviewed by</label>
        <select
          value={selectedReviewer}
          onChange={(e) => {
            setSelectedReviewer(e.target.value)
            if (e.target.value !== '__other__') setCustomReviewer('')
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
        >
          <option value="">Select reviewer...</option>
          {REVIEWER_OPTIONS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="__other__">Someone else</option>
        </select>
        {selectedReviewer === '__other__' && (
          <input
            type="text"
            value={customReviewer}
            onChange={(e) => setCustomReviewer(e.target.value)}
            placeholder="Type reviewer name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ziwa-500"
          />
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Comments (optional — use @ to mention someone)</label>
        <MentionInput
          value={comments}
          mentions={mentions}
          onChange={(v, m) => {
            setComments(v)
            setMentions(m)
          }}
          userGroups={userGroups}
          placeholder="Any notes on the report… use @ to mention someone"
          rows={2}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmitReview}
          disabled={loading}
          className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-md px-4 py-2 transition-colors"
        >
          {loading ? 'Saving...' : 'Submit Review'}
        </button>
        <button
          onClick={() => { setShowForm(false); setError(null) }}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium rounded-md px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
