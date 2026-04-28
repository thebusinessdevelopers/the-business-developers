'use client'

import { useState, useEffect } from 'react'
import type { MeetingType } from '@/types'
import {
  MEETING_TYPES,
  SECRETARY_OPTIONS,
  getTuesdayOfWeek,
} from '@hod/shared/config/meetings'

interface HodUser {
  id: string
  hod_name: string
  username: string
  department_id: string | null
}

interface DelegateFormProps {
  hodUsers: HodUser[]
  onBack: () => void
  onDelegated: (id: string) => void
}

export default function DelegateForm({ hodUsers, onBack, onDelegated }: DelegateFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meetingType, setMeetingType] = useState<MeetingType>('regular')
  const [specialTitle, setSpecialTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(getTuesdayOfWeek())
  const [startTime, setStartTime] = useState('')
  const [secretaryMode, setSecretaryMode] = useState<'emilly' | 'patience'>('emilly')

  function getSecretaryUserId(): string | null {
    const username = secretaryMode === 'emilly' ? 'reception.emilly' : 'reception.patience'
    return hodUsers.find(u => u.username === username)?.id ?? null
  }

  async function handleSubmit() {
    const secretaryUserId = getSecretaryUserId()
    if (!secretaryUserId) {
      setError('Secretary not found in the system')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegate: true,
          meeting_type: meetingType,
          special_title: meetingType === 'special' ? specialTitle : null,
          date: meetingDate,
          start_time: startTime || null,
          secretary_user_id: secretaryUserId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delegate meeting')
      onDelegated(data.id)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Delegate to Secretary</h1>
      </div>

      <p className="text-sm text-gray-500">
        Set the meeting basics and assign a secretary. They will receive a notification and can fill in the full meeting record from their portal.
      </p>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
            <select
              value={meetingType}
              onChange={e => setMeetingType(e.target.value as MeetingType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {meetingType === 'special' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={specialTitle}
                onChange={e => setSpecialTitle(e.target.value)}
                placeholder="e.g. Budget review"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (optional)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secretary</label>
          <div className="flex gap-2">
            {SECRETARY_OPTIONS.map(opt => (
              <button
                key={opt.username}
                type="button"
                onClick={() => setSecretaryMode(opt.label.toLowerCase() as 'emilly' | 'patience')}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  secretaryMode === opt.label.toLowerCase() ? 'bg-ziwa-50 border-ziwa-300 text-ziwa-700 font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-ziwa-500 hover:bg-ziwa-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send Invitation'}
        </button>
        <button type="button" onClick={onBack} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
