'use client'

import { useState, useEffect } from 'react'
import type { MeetingListItem, Meeting, MeetingActionItem, MeetingType } from '@/types'
import {
  MEETING_STATUS_COLOURS,
  ACTION_ITEM_STATUS_COLOURS,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_PRIORITIES,
} from '@hod/shared/config/meetings'
import SecretaryMeetingForm from './SecretaryMeetingForm'

interface DelegatedMeeting {
  id: string
  meeting_type: MeetingType
  special_title: string | null
  date: string
  start_time: string | null
  end_time: string | null
}

interface MeetingsTabProps {
  currentUserId: string
  departmentId: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = Number(h)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${suffix}`
}

export default function MeetingsTab({ currentUserId, departmentId }: MeetingsTabProps) {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null)
  const [delegated, setDelegated] = useState<DelegatedMeeting[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API JSON shape matches SecretaryMeetingForm props
  const [delegatedFormData, setDelegatedFormData] = useState<{ departments: any[]; hodUsers: any[]; adminUsers: any[] } | null>(null)
  const [activeDelegation, setActiveDelegation] = useState<DelegatedMeeting | null>(null)

  useEffect(() => {
    fetch('/api/meetings?limit=20')
      .then(r => r.json())
      .then(data => setMeetings(data.meetings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/meetings/delegated')
      .then(r => r.json())
      .then(data => {
        setDelegated(data.meetings ?? [])
        if (data.departments || data.hodUsers || data.adminUsers) {
          setDelegatedFormData({
            departments: data.departments ?? [],
            hodUsers: data.hodUsers ?? [],
            adminUsers: data.adminUsers ?? [],
          })
        }
      })
      .catch(() => {})
  }, [])

  if (activeDelegation && delegatedFormData) {
    return (
      <SecretaryMeetingForm
        meeting={activeDelegation}
        departments={delegatedFormData.departments}
        hodUsers={delegatedFormData.hodUsers}
        adminUsers={delegatedFormData.adminUsers}
        onBack={() => setActiveDelegation(null)}
        onSubmitted={() => {
          setActiveDelegation(null)
          setDelegated(prev => prev.filter(d => d.id !== activeDelegation.id))
        }}
      />
    )
  }

  if (activeMeeting) {
    return (
      <MeetingDetail
        meetingId={activeMeeting}
        currentUserId={currentUserId}
        departmentId={departmentId}
        onBack={() => setActiveMeeting(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">Loading meetings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {delegated.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending — You are Secretary</h3>
          {delegated.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveDelegation(m)}
              className="w-full text-left rounded-xl border-2 border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{formatDate(m.date)}</span>
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Awaiting your input</span>
              </div>
              <p className="text-xs text-gray-500">
                {m.meeting_type === 'special' ? m.special_title ?? 'Special Meeting' : `${m.meeting_type.charAt(0).toUpperCase() + m.meeting_type.slice(1)} Meeting`}
                {m.start_time ? ` — ${m.start_time}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {meetings.length === 0 && delegated.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No meeting records yet</p>
          <p className="text-xs text-gray-400 mt-1">Approved meeting records will appear here.</p>
        </div>
      ) : meetings.length > 0 ? (
        <div className="space-y-3">
          {delegated.length > 0 && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved Meetings</h3>}
          {meetings.map(m => {
            const presentCount = (m.attendance ?? []).filter(a => a.status === 'present').length
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMeeting(m.id)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{formatDate(m.date)}</span>
                  <span className={`text-xs border rounded px-2 py-0.5 ${MEETING_STATUS_COLOURS[m.status] ?? ''}`}>
                    {m.meeting_type === 'special' ? m.special_title ?? 'Special' : m.meeting_type.charAt(0).toUpperCase() + m.meeting_type.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{presentCount} attended</span>
                  {(m.action_item_count ?? 0) > 0 && (
                    <span>{m.action_item_count} action item{m.action_item_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

interface MeetingDetailProps {
  meetingId: string
  currentUserId: string
  departmentId: string
  onBack: () => void
}

function MeetingDetail({ meetingId, currentUserId, departmentId, onBack }: MeetingDetailProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [completionForm, setCompletionForm] = useState({ explanation: '', completionDate: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}`)
      .then(r => r.json())
      .then(data => {
        setMeeting(data.meeting)
        setActionItems(data.actionItems ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [meetingId])

  async function handleSubmitCompletion(itemId: string) {
    if (!completionForm.explanation || !completionForm.completionDate) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/meetings/action-items/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionItemId: itemId,
          explanation: completionForm.explanation,
          completionDate: completionForm.completionDate,
        }),
      })
      if (res.ok) {
        setActionItems(prev => prev.map(ai =>
          ai.id === itemId ? { ...ai, status: 'submitted' } : ai
        ))
        setCompletingId(null)
        setCompletionForm({ explanation: '', completionDate: '' })
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">Loading meeting…</p>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Meeting not found</p>
        <button type="button" onClick={onBack} className="mt-2 text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
          Back to meetings
        </button>
      </div>
    )
  }

  const isAssignedToMe = (item: MeetingActionItem) => {
    if (item.assigned_user_id === currentUserId) return true
    if (item.assigned_dept_id === departmentId) return true
    return false
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700">
        &larr; Back to meetings
      </button>

      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {meeting.meeting_type === 'special' ? meeting.special_title ?? 'Special Meeting' : `${meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)} Meeting`}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{formatDate(meeting.date)}</p>
        {(meeting.start_time || meeting.end_time) && (
          <p className="text-xs text-gray-400">
            {meeting.start_time && formatTime(meeting.start_time)}
            {meeting.start_time && meeting.end_time && ' – '}
            {meeting.end_time && formatTime(meeting.end_time)}
          </p>
        )}
      </div>

      {/* Attendance */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Attendance</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {(meeting.attendance ?? []).map(a => (
            <div key={a.user_id} className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                a.status === 'present' ? 'bg-green-500' : a.status === 'apology' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-700">{a.hod_name}</span>
              {a.status !== 'present' && (
                <span className="text-gray-400">({a.status})</span>
              )}
            </div>
          ))}
        </div>
        {meeting.additional_attendees.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium">Also present: </span>
            {meeting.additional_attendees.map(a => a.name).join(', ')}
          </div>
        )}
      </section>

      {/* Agenda */}
      {meeting.agenda.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Agenda</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            {meeting.agenda.map((a, i) => (
              <li key={i}>{a.title}</li>
            ))}
          </ol>
        </section>
      )}

      {/* General notes */}
      {meeting.general_notes && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">General Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting.general_notes}</p>
        </section>
      )}

      {/* Per-HOD notes */}
      {Object.keys(meeting.per_hod_notes).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">HOD Contributions</h3>
          <div className="space-y-3">
            {Object.values(meeting.per_hod_notes).map(note => {
              if (note.did_not_speak) {
                return (
                  <div key={note.user_id} className="text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{note.hod_name}</span> — Did not speak
                  </div>
                )
              }
              if (!note.notes) return null
              return (
                <div key={note.user_id}>
                  <p className="text-xs font-medium text-gray-600">{note.hod_name}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-0.5">{note.notes}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Decisions */}
      {meeting.decisions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Decisions Made</h3>
          <ul className="space-y-1">
            {meeting.decisions.map((d, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ziwa-500 mt-1.5 shrink-0" />
                {d.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Action Items</h3>
          <div className="space-y-3">
            {actionItems.map(item => {
              const mine = isAssignedToMe(item)
              const priorityDef = ACTION_ITEM_PRIORITIES.find(p => p.value === item.priority)
              const canComplete = mine && (item.status === 'open' || item.status === 'rejected')

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 ${mine ? 'border-ziwa-200 bg-ziwa-50/30' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800">{item.description}</p>
                    <span className={`text-xs border rounded px-1.5 py-0.5 shrink-0 ${ACTION_ITEM_STATUS_COLOURS[item.status] ?? ''}`}>
                      {ACTION_ITEM_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {item.assigned_dept && <span>{item.assigned_dept.name}</span>}
                    {item.assigned_sub_dept && <span>({item.assigned_sub_dept})</span>}
                    {item.assigned_user && <span>{item.assigned_user.hod_name}</span>}
                    {item.deadline && <span>Due: {formatDate(item.deadline)}</span>}
                    <span className={`px-1.5 rounded ${
                      priorityDef?.colour === 'red' ? 'bg-red-100 text-red-600' :
                      priorityDef?.colour === 'amber' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item.priority}
                    </span>
                  </div>

                  {item.status === 'rejected' && item.review_note && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      Rejection note: {item.review_note}
                    </div>
                  )}

                  {item.status === 'verified' && item.completion_explanation && (
                    <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                      Completed: {item.completion_explanation}
                    </div>
                  )}

                  {canComplete && completingId !== item.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletingId(item.id)
                        setCompletionForm({ explanation: '', completionDate: new Date().toISOString().split('T')[0] })
                      }}
                      className="mt-2 text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
                    >
                      Mark as complete
                    </button>
                  )}

                  {completingId === item.id && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <textarea
                        placeholder="How was this completed?"
                        value={completionForm.explanation}
                        onChange={e => setCompletionForm(prev => ({ ...prev, explanation: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-ziwa-500 focus:border-ziwa-500"
                        rows={3}
                      />
                      <input
                        type="date"
                        value={completionForm.completionDate}
                        onChange={e => setCompletionForm(prev => ({ ...prev, completionDate: e.target.value }))}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-ziwa-500 focus:border-ziwa-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSubmitCompletion(item.id)}
                          disabled={submitting || !completionForm.explanation || !completionForm.completionDate}
                          className="text-xs bg-ziwa-500 text-white px-3 py-1.5 rounded-lg hover:bg-ziwa-600 disabled:opacity-50 font-medium"
                        >
                          {submitting ? 'Submitting…' : 'Submit completion'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Closing */}
      {meeting.closing_notes && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Closing Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting.closing_notes}</p>
        </section>
      )}
      {meeting.suggested_next_date && (
        <p className="text-xs text-gray-400">
          Next meeting suggested: {formatDate(meeting.suggested_next_date)}
        </p>
      )}
    </div>
  )
}
