'use client'

import { useState, useEffect } from 'react'
import type {
  MeetingType,
  AttendanceStatus,
  MeetingAttendee,
  AdditionalAttendee,
  PerHodNote,
  ActionItemAssigneeType,
  ActionItemPriority,
} from '@/types'
import {
  ATTENDANCE_STATUSES,
  ASSIGNEE_TYPES,
  ACTION_ITEM_PRIORITIES,
  SENIOR_INDIVIDUALS,
  CORE_ATTENDEE_USERNAMES,
  CORE_ADMIN_ATTENDEE_USERNAMES,
  getNextTuesday,
} from '@hod/shared/config/meetings'

interface Department {
  id: string
  name: string
  slug: string
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

interface DraftMeeting {
  id: string
  meeting_type: MeetingType
  special_title: string | null
  date: string
  start_time: string | null
  end_time: string | null
}

interface ActionItemDraft {
  description: string
  assignee_type: ActionItemAssigneeType
  assigned_dept_id: string
  assigned_sub_dept: string
  assigned_user_id: string
  deadline: string
  priority: ActionItemPriority
}

const emptyActionItem = (): ActionItemDraft => ({
  description: '',
  assignee_type: 'department',
  assigned_dept_id: '',
  assigned_sub_dept: '',
  assigned_user_id: '',
  deadline: '',
  priority: 'medium',
})

interface SecretaryMeetingFormProps {
  meeting: DraftMeeting
  departments: Department[]
  hodUsers: HodUser[]
  adminUsers: AdminUserRow[]
  onBack: () => void
  onSubmitted: () => void
}

export default function SecretaryMeetingForm({
  meeting,
  departments,
  hodUsers,
  adminUsers,
  onBack,
  onSubmitted,
}: SecretaryMeetingFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coreHodUsers = hodUsers.filter(u => CORE_ATTENDEE_USERNAMES.includes(u.username))
  const coreAdminUsers = adminUsers.filter(u => CORE_ADMIN_ATTENDEE_USERNAMES.includes(u.username))
  const allCoreAttendees = [
    ...coreHodUsers.map(u => ({ id: u.id, hod_name: u.hod_name, username: u.username, department_id: u.department_id })),
    ...coreAdminUsers.map(u => ({ id: u.id, hod_name: u.hod_name, username: u.username, department_id: null as string | null })),
  ]

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [additionalAttendees, setAdditionalAttendees] = useState<AdditionalAttendee[]>([])
  const [agendaItems, setAgendaItems] = useState<string[]>([''])
  const [generalNotes, setGeneralNotes] = useState('')
  const [perHodNotes, setPerHodNotes] = useState<Record<string, { notes: string; did_not_speak: boolean }>>({})
  const [decisions, setDecisions] = useState<string[]>([''])
  const [actionItems, setActionItems] = useState<ActionItemDraft[]>([emptyActionItem()])
  const [suggestedNextDate, setSuggestedNextDate] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [endTime, setEndTime] = useState(meeting.end_time ?? '')

  const presentAttendees = allCoreAttendees.filter(u => attendance[u.id] === 'present')

  useEffect(() => {
    const defaults: Record<string, AttendanceStatus> = {}
    for (const u of allCoreAttendees) defaults[u.id] = 'absent'
    setAttendance(defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hodUsers, adminUsers])

  useEffect(() => {
    setSuggestedNextDate(getNextTuesday(meeting.date))
  }, [meeting.date])

  function updateAttendance(userId: string, status: AttendanceStatus) {
    setAttendance(prev => ({ ...prev, [userId]: status }))
  }

  function updatePerHodNote(userId: string, field: 'notes' | 'did_not_speak', val: string | boolean) {
    setPerHodNotes(prev => ({
      ...prev,
      [userId]: { ...prev[userId] ?? { notes: '', did_not_speak: false }, [field]: val },
    }))
  }

  function updateActionItem(idx: number, field: keyof ActionItemDraft, val: string) {
    setActionItems(prev => prev.map((ai, i) => i === idx ? { ...ai, [field]: val } : ai))
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    const attendanceArr: MeetingAttendee[] = allCoreAttendees.map(u => {
      const dept = departments.find(d => d.id === u.department_id)
      return {
        user_id: u.id,
        hod_name: u.hod_name,
        department_slug: dept?.slug ?? '',
        status: attendance[u.id] ?? 'absent',
      }
    })

    const perHodNotesObj: Record<string, PerHodNote> = {}
    for (const u of allCoreAttendees) {
      if (attendance[u.id] !== 'present') continue
      const note = perHodNotes[u.id]
      const dept = departments.find(d => d.id === u.department_id)
      perHodNotesObj[u.id] = {
        user_id: u.id,
        hod_name: u.hod_name,
        department_slug: dept?.slug ?? '',
        notes: note?.notes ?? '',
        did_not_speak: note?.did_not_speak ?? false,
      }
    }

    const filteredActionItems = actionItems
      .filter(ai => ai.description.trim())
      .map(ai => ({
        description: ai.description,
        assignee_type: ai.assignee_type,
        assigned_dept_id: ai.assignee_type === 'department' || ai.assignee_type === 'sub_department' ? ai.assigned_dept_id || null : null,
        assigned_sub_dept: ai.assignee_type === 'sub_department' ? ai.assigned_sub_dept || null : null,
        assigned_user_id: ai.assignee_type === 'individual' ? ai.assigned_user_id || null : null,
        deadline: ai.deadline || null,
        priority: ai.priority,
      }))

    const body = {
      date: meeting.date,
      end_time: endTime || null,
      attendance: attendanceArr,
      additional_attendees: additionalAttendees.filter(a => a.name.trim()),
      agenda: agendaItems.filter(a => a.trim()).map(a => ({ title: a })),
      general_notes: generalNotes || null,
      per_hod_notes: perHodNotesObj,
      decisions: decisions.filter(d => d.trim()).map(d => ({ text: d })),
      suggested_next_date: suggestedNextDate || null,
      closing_notes: closingNotes || null,
      action_items: filteredActionItems,
    }

    try {
      const res = await fetch(`/api/meetings/delegated/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit meeting')
      onSubmitted()
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setSubmitting(false)
  }

  const title = meeting.meeting_type === 'special'
    ? meeting.special_title ?? 'Special Meeting'
    : `${meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)} Meeting`

  const dateLabel = new Date(meeting.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{dateLabel}{meeting.start_time ? ` — ${meeting.start_time}` : ''}</p>
        </div>
      </div>

      <div className="bg-ziwa-50 border border-ziwa-200 rounded-xl p-3">
        <p className="text-sm text-ziwa-700">You have been assigned as secretary for this meeting. Fill in the record below and submit when complete.</p>
      </div>

      {/* Attendance */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Attendance</h3>
        <div className="space-y-2">
          {allCoreAttendees.map(u => {
            const dept = departments.find(d => d.id === u.department_id)
            const admin = coreAdminUsers.find(a => a.id === u.id)
            return (
              <div key={u.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm text-gray-800">{u.hod_name}</span>
                  {dept && <span className="text-xs text-gray-400 ml-2">{dept.name}</span>}
                  {admin?.admin_title && <span className="text-xs text-gray-400 ml-2">{admin.admin_title}</span>}
                </div>
                <div className="flex gap-1">
                  {ATTENDANCE_STATUSES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateAttendance(u.id, s.value)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        attendance[u.id] === s.value
                          ? s.value === 'present' ? 'bg-green-100 border-green-300 text-green-700'
                            : s.value === 'apology' ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-red-100 border-red-300 text-red-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-1.5">Additional Attendees</h4>
          {additionalAttendees.map((aa, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input type="text" placeholder="Name" value={aa.name} onChange={e => setAdditionalAttendees(prev => prev.map((a, j) => j === i ? { ...a, name: e.target.value } : a))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <select value={aa.department} onChange={e => setAdditionalAttendees(prev => prev.map((a, j) => j === i ? { ...a, department: e.target.value } : a))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                <option value="External">External</option>
              </select>
              <div className="flex gap-1">
                <input type="text" placeholder="Reason" value={aa.reason} onChange={e => setAdditionalAttendees(prev => prev.map((a, j) => j === i ? { ...a, reason: e.target.value } : a))} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={() => setAdditionalAttendees(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAdditionalAttendees(prev => [...prev, { name: '', department: '', reason: '' }])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
            + Add attendee
          </button>
        </div>
      </section>

      {/* Agenda */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Agenda</h3>
        {agendaItems.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-sm text-gray-400 mt-2 w-6 text-right">{i + 1}.</span>
            <input type="text" value={item} onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? e.target.value : a))} placeholder="Agenda topic" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {agendaItems.length > 1 && (
              <button type="button" onClick={() => setAgendaItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setAgendaItems(prev => [...prev, ''])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">+ Add agenda item</button>
      </section>

      {/* General Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">General Notes</h3>
        <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} placeholder="Key discussions, context, observations" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={4} />
      </section>

      {/* HOD Contributions — present only */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">HOD Contributions</h3>
        {presentAttendees.length === 0 ? (
          <p className="text-xs text-gray-400">Mark attendees as present above to add their contributions.</p>
        ) : (
          <div className="space-y-3">
            {presentAttendees.map(u => {
              const dept = departments.find(d => d.id === u.department_id)
              const note = perHodNotes[u.id] ?? { notes: '', did_not_speak: false }
              return (
                <div key={u.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{u.hod_name}</span>
                      {dept && <span className="text-xs text-gray-400 ml-2">{dept.name}</span>}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={note.did_not_speak} onChange={e => updatePerHodNote(u.id, 'did_not_speak', e.target.checked)} className="rounded border-gray-300" />
                      Did not speak
                    </label>
                  </div>
                  {!note.did_not_speak && (
                    <textarea value={note.notes} onChange={e => updatePerHodNote(u.id, 'notes', e.target.value)} placeholder={`What did ${u.hod_name} contribute?`} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Decisions */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Decisions Made</h3>
        {decisions.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={d} onChange={e => setDecisions(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder="Decision" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {decisions.length > 1 && (
              <button type="button" onClick={() => setDecisions(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setDecisions(prev => [...prev, ''])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">+ Add decision</button>
      </section>

      {/* Action Items */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Action Items</h3>
        {actionItems.map((ai, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
              {actionItems.length > 1 && (
                <button type="button" onClick={() => setActionItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              )}
            </div>
            <textarea value={ai.description} onChange={e => updateActionItem(i, 'description', e.target.value)} placeholder="Describe the action item" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignee Type</label>
                <select value={ai.assignee_type} onChange={e => updateActionItem(i, 'assignee_type', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {ASSIGNEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {(ai.assignee_type === 'department' || ai.assignee_type === 'sub_department') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select value={ai.assigned_dept_id} onChange={e => updateActionItem(i, 'assigned_dept_id', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {ai.assignee_type === 'sub_department' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sub-department</label>
                  <input type="text" value={ai.assigned_sub_dept} onChange={e => updateActionItem(i, 'assigned_sub_dept', e.target.value)} placeholder="e.g. Carpentry" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              {ai.assignee_type === 'individual' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Individual</label>
                  <select value={ai.assigned_user_id} onChange={e => updateActionItem(i, 'assigned_user_id', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select person</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.hod_name}{u.admin_title ? ` (${u.admin_title})` : ''}</option>
                    ))}
                    {SENIOR_INDIVIDUALS.map(s => {
                      const existing = adminUsers.find(u => u.hod_name.toLowerCase().includes(s.role))
                      if (existing) return null
                      return <option key={s.role} value={s.role} disabled>{s.label} (not in system)</option>
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline (optional)</label>
                <input type="date" value={ai.deadline} onChange={e => updateActionItem(i, 'deadline', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select value={ai.priority} onChange={e => updateActionItem(i, 'priority', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {ACTION_ITEM_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setActionItems(prev => [...prev, emptyActionItem()])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">+ Add action item</button>
      </section>

      {/* Close */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Close</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Suggested Next Meeting</label>
          <input type="date" value={suggestedNextDate} onChange={e => setSuggestedNextDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Closing Notes (optional)</label>
          <textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Any closing remarks" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-ziwa-500 hover:bg-ziwa-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Meeting Record'}
        </button>
        <button type="button" onClick={onBack} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
