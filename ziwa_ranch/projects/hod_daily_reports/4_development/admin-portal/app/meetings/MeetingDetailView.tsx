'use client'

import { useState, useEffect } from 'react'
import type { Meeting, MeetingActionItem } from '@/types'
import {
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLOURS,
  ACTION_ITEM_STATUS_LABELS,
  ACTION_ITEM_STATUS_COLOURS,
  ACTION_ITEM_PRIORITIES,
} from '@hod/shared/config/meetings'
import MeetingForm from './MeetingForm'

interface Department {
  id: string
  name: string
  slug: string
  hods: string[]
}

interface HodUser {
  id: string
  hod_name: string
  username: string
  department_id: string | null
}

interface AdminUserRow {
  id: string
  hod_name: string
  username: string
  admin_title: string | null
}

interface MeetingDetailViewProps {
  meetingId: string
  adminId: string
  adminName: string
  departments: Department[]
  hodUsers: HodUser[]
  adminUsers: AdminUserRow[]
  onBack: () => void
  onDeleted?: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

export default function MeetingDetailView({ meetingId, adminId, adminName, departments, hodUsers, adminUsers, onBack, onDeleted }: MeetingDetailViewProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [actionModal, setActionModal] = useState<{ itemId: string; action: string } | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionExplanation, setActionExplanation] = useState('')
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0])
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function handleApprove() {
    setApproving(true)
    try {
      const res = await fetch('/api/meetings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      })
      if (res.ok) {
        setMeeting(prev => prev ? { ...prev, status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() } : prev)
      }
    } catch { /* ignore */ }
    setApproving(false)
  }

  async function handleActionItemAction() {
    if (!actionModal) return
    setActionSubmitting(true)

    const body: Record<string, unknown> = {
      actionItemId: actionModal.itemId,
      action: actionModal.action,
    }

    if (actionModal.action === 'reject' || actionModal.action === 'cancel') {
      body.note = actionNote
    }
    if (actionModal.action === 'complete') {
      body.explanation = actionExplanation
      body.completionDate = actionDate
    }

    try {
      const res = await fetch('/api/meetings/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const newStatus = actionModal.action === 'verify' ? 'verified'
          : actionModal.action === 'reject' ? 'open'
          : actionModal.action === 'complete' ? 'verified'
          : 'cancelled'
        setActionItems(prev => prev.map(ai =>
          ai.id === actionModal.itemId ? { ...ai, status: newStatus } : ai
        ))
        setActionModal(null)
        setActionNote('')
        setActionExplanation('')
      }
    } catch { /* ignore */ }
    setActionSubmitting(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted ? onDeleted() : onBack()
        return
      }
    } catch { /* ignore */ }
    setDeleting(false)
    setDeleteConfirm(false)
  }

  if (loading) {
    return <div className="text-center py-12"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Meeting not found</p>
        <button type="button" onClick={onBack} className="mt-2 text-xs text-ziwa-600 font-medium">Back</button>
      </div>
    )
  }

  if (editing) {
    return (
      <MeetingForm
        adminId={adminId}
        adminName={adminName}
        departments={departments}
        hodUsers={hodUsers}
        adminUsers={adminUsers}
        editingMeeting={meeting}
        editingActionItems={actionItems}
        onBack={() => setEditing(false)}
        onCreated={() => {
          setEditing(false)
          fetch(`/api/meetings/${meetingId}`)
            .then(r => r.json())
            .then(data => {
              setMeeting(data.meeting)
              setActionItems(data.actionItems ?? [])
            })
            .catch(() => {})
        }}
      />
    )
  }

  const presentCount = (meeting.attendance ?? []).filter(a => a.status === 'present').length
  const apologyCount = (meeting.attendance ?? []).filter(a => a.status === 'apology').length

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to meetings</button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium px-3 py-1.5 border border-ziwa-200 rounded-lg hover:bg-ziwa-50 transition-colors">
            Edit
          </button>
          <button type="button" onClick={() => setDeleteConfirm(true)} className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            Delete
          </button>
          <span className={`text-xs border rounded px-2 py-0.5 ${MEETING_STATUS_COLOURS[meeting.status] ?? ''}`}>
            {MEETING_STATUS_LABELS[meeting.status]}
          </span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {meeting.meeting_type === 'special' ? meeting.special_title ?? 'Special Meeting' : `${meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)} Meeting`}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{formatDate(meeting.date)}</p>
        {(meeting.start_time || meeting.end_time) && (
          <p className="text-xs text-gray-400">
            {meeting.start_time && formatTime(meeting.start_time)}
            {meeting.start_time && meeting.end_time && ' – '}
            {meeting.end_time && formatTime(meeting.end_time)}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {presentCount} present{apologyCount > 0 ? `, ${apologyCount} apologies` : ''}
        </p>
      </div>

      {meeting.status === 'submitted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting approval</p>
            <p className="text-xs text-amber-600">Review the meeting record and approve to make it visible to HODs.</p>
          </div>
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      )}

      {/* Attendance */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Attendance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {(meeting.attendance ?? []).map(a => (
            <div key={a.user_id} className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                a.status === 'present' ? 'bg-green-500' : a.status === 'apology' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-700">
                {a.hod_name}
                {a.attendance_mode && (
                  <span className="text-gray-400"> — {a.attendance_mode === 'phone' ? 'Phone' : 'In person'}</span>
                )}
              </span>
              {a.status !== 'present' && <span className="text-gray-400">({a.status})</span>}
            </div>
          ))}
        </div>
        {meeting.additional_attendees.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Also present:</span> {meeting.additional_attendees.map(a => `${a.name} (${a.department} — ${a.reason})`).join(', ')}
          </p>
        )}
      </section>

      {/* Agenda */}
      {meeting.agenda.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Agenda</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            {meeting.agenda.map((a, i) => <li key={i}>{a.title}</li>)}
          </ol>
        </section>
      )}

      {/* General notes */}
      {meeting.general_notes && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">General Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting.general_notes}</p>
        </section>
      )}

      {/* Per-HOD notes */}
      {Object.keys(meeting.per_hod_notes).length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">HOD Contributions</h2>
          <div className="space-y-3">
            {Object.values(meeting.per_hod_notes).map(note => {
              if (note.did_not_speak) {
                return <p key={note.user_id} className="text-xs text-gray-400"><span className="font-medium text-gray-500">{note.hod_name}</span> — Did not speak</p>
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
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Decisions Made</h2>
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

      {/* Action Items */}
      {actionItems.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Action Items</h2>
          <div className="space-y-3">
            {actionItems.map(item => {
              const priorityDef = ACTION_ITEM_PRIORITIES.find(p => p.value === item.priority)
              return (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4">
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
                    {item.deadline && <span>Due: {new Date(item.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    <span className={`px-1.5 rounded ${
                      priorityDef?.colour === 'red' ? 'bg-red-100 text-red-600' :
                      priorityDef?.colour === 'amber' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item.priority}
                    </span>
                  </div>

                  {/* Completion info */}
                  {item.completion_explanation && (
                    <div className="mt-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                      <span className="font-medium text-gray-600">Completion:</span> {item.completion_explanation}
                      {item.completion_date && <span className="text-gray-400 ml-2">({new Date(item.completion_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})</span>}
                    </div>
                  )}

                  {item.review_note && (
                    <div className="mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      Admin note: {item.review_note}
                    </div>
                  )}

                  {/* Admin action buttons */}
                  <div className="flex gap-2 mt-3">
                    {item.status === 'submitted' && (
                      <>
                        <button type="button" onClick={() => { setActionModal({ itemId: item.id, action: 'verify' }); setActionNote('') }} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">Verify</button>
                        <button type="button" onClick={() => { setActionModal({ itemId: item.id, action: 'reject' }); setActionNote('') }} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 font-medium">Reject</button>
                      </>
                    )}
                    {(item.status === 'open' || item.status === 'rejected') && (
                      <button type="button" onClick={() => { setActionModal({ itemId: item.id, action: 'complete' }); setActionExplanation(''); setActionDate(new Date().toISOString().split('T')[0]) }} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium">Complete Directly</button>
                    )}
                    {item.status !== 'verified' && item.status !== 'cancelled' && (
                      <button type="button" onClick={() => { setActionModal({ itemId: item.id, action: 'cancel' }); setActionNote('') }} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">Cancel</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Closing */}
      {(meeting.closing_notes || meeting.suggested_next_date) && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          {meeting.closing_notes && (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Closing Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{meeting.closing_notes}</p>
            </>
          )}
          {meeting.suggested_next_date && (
            <p className="text-xs text-gray-400 mt-2">
              Next meeting suggested: {new Date(meeting.suggested_next_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </section>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Meeting</h3>
            <p className="text-sm text-gray-600">
              This will permanently delete this meeting record and all its action items. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 capitalize">{actionModal.action} Action Item</h3>

            {actionModal.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Note (required)</label>
                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder="Explain why this is being rejected" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
            )}

            {actionModal.action === 'cancel' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder="Optional cancellation reason" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
            )}

            {actionModal.action === 'complete' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">How was this completed?</label>
                  <textarea value={actionExplanation} onChange={e => setActionExplanation(e.target.value)} placeholder="Explanation" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                  <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </>
            )}

            {actionModal.action === 'verify' && (
              <p className="text-sm text-gray-600">Confirm this action item has been satisfactorily completed?</p>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setActionModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
              <button
                type="button"
                onClick={handleActionItemAction}
                disabled={actionSubmitting || (actionModal.action === 'reject' && !actionNote) || (actionModal.action === 'complete' && (!actionExplanation || !actionDate))}
                className="text-sm bg-ziwa-500 text-white px-4 py-2 rounded-lg hover:bg-ziwa-600 disabled:opacity-50 font-medium"
              >
                {actionSubmitting ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
