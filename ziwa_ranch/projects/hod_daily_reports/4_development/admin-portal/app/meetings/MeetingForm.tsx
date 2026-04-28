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
  MeetingActionItem,
} from '@/types'
import {
  MEETING_TYPES,
  ATTENDANCE_STATUSES,
  ASSIGNEE_TYPES,
  ACTION_ITEM_PRIORITIES,
  SENIOR_INDIVIDUALS,
  SECRETARY_OPTIONS,
  CORE_ATTENDEE_USERNAMES,
  CORE_ADMIN_ATTENDEE_USERNAMES,
  getTuesdayOfWeek,
  getNextTuesday,
} from '@hod/shared/config/meetings'

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

interface MeetingFormProps {
  adminId: string
  adminName: string
  departments: Department[]
  hodUsers: HodUser[]
  adminUsers: AdminUserRow[]
  editingMeeting?: import('@/types').Meeting
  editingActionItems?: import('@/types').MeetingActionItem[]
  onBack: () => void
  onCreated: (id: string) => void
}

interface ActionItemDraft {
  id?: string
  description: string
  assignee_type: ActionItemAssigneeType
  assigned_dept_id: string
  assigned_sub_dept: string
  assigned_user_id: string
  deadline: string
  priority: ActionItemPriority
}

interface OutstandingItem {
  id: string
  description: string
  status: string
  priority: string
  assigned_dept?: { name: string } | null
  assigned_user?: { hod_name: string } | null
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

export default function MeetingForm({
  adminId,
  adminName,
  departments,
  hodUsers,
  adminUsers,
  editingMeeting,
  editingActionItems,
  onBack,
  onCreated,
}: MeetingFormProps) {
  const isEditing = !!editingMeeting

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Section 1: Meeting details
  const [meetingType, setMeetingType] = useState<MeetingType>(editingMeeting?.meeting_type ?? 'regular')
  const [specialTitle, setSpecialTitle] = useState(editingMeeting?.special_title ?? '')
  const [meetingDate, setMeetingDate] = useState(editingMeeting?.date ?? getTuesdayOfWeek())
  const [startTime, setStartTime] = useState(editingMeeting?.start_time ?? '')
  const [endTime, setEndTime] = useState(editingMeeting?.end_time ?? '')
  const [secretaryMode, setSecretaryMode] = useState<'emilly' | 'patience' | 'other'>(() => {
    if (!editingMeeting) return 'emilly'
    const secUser = hodUsers.find(u => u.id === editingMeeting.secretary_user_id)
    if (secUser?.username === 'reception.emilly') return 'emilly'
    if (secUser?.username === 'reception.patience') return 'patience'
    return 'other'
  })
  const [secretaryCustom, setSecretaryCustom] = useState(editingMeeting?.secretary_custom_name ?? '')

  // Section 2: Attendance
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [attendanceMode, setAttendanceMode] = useState<Record<string, 'phone' | 'in_person'>>({})
  const [additionalAttendees, setAdditionalAttendees] = useState<AdditionalAttendee[]>(editingMeeting?.additional_attendees ?? [])

  // Section 3: Agenda
  const [agendaItems, setAgendaItems] = useState<string[]>(() => {
    if (editingMeeting?.agenda?.length) return editingMeeting.agenda.map(a => a.title)
    return ['']
  })

  // Section 4: General notes
  const [generalNotes, setGeneralNotes] = useState(editingMeeting?.general_notes ?? '')

  // Section 5: Per-HOD notes
  const [perHodNotes, setPerHodNotes] = useState<Record<string, { notes: string; did_not_speak: boolean }>>(() => {
    if (!editingMeeting?.per_hod_notes) return {}
    const result: Record<string, { notes: string; did_not_speak: boolean }> = {}
    for (const [uid, note] of Object.entries(editingMeeting.per_hod_notes)) {
      result[uid] = { notes: note.notes, did_not_speak: note.did_not_speak }
    }
    return result
  })

  // Section 6: Decisions
  const [decisions, setDecisions] = useState<string[]>(() => {
    if (editingMeeting?.decisions?.length) return editingMeeting.decisions.map(d => d.text)
    return ['']
  })

  // Section 7: Action items
  const [actionItems, setActionItems] = useState<ActionItemDraft[]>(() => {
    if (editingActionItems?.length) {
      return editingActionItems.map(ai => ({
        id: ai.id,
        description: ai.description,
        assignee_type: ai.assignee_type,
        assigned_dept_id: ai.assigned_dept_id ?? '',
        assigned_sub_dept: ai.assigned_sub_dept ?? '',
        assigned_user_id: ai.assigned_user_id ?? '',
        deadline: ai.deadline ?? '',
        priority: ai.priority,
      }))
    }
    return [emptyActionItem()]
  })

  // Section 8: Close
  const [suggestedNextDate, setSuggestedNextDate] = useState(editingMeeting?.suggested_next_date ?? '')
  const [closingNotes, setClosingNotes] = useState(editingMeeting?.closing_notes ?? '')

  // Outstanding items from previous meeting
  const [outstandingItems, setOutstandingItems] = useState<OutstandingItem[]>([])
  const [outstandingDate, setOutstandingDate] = useState<string | null>(null)

  useEffect(() => {
    setSuggestedNextDate(getNextTuesday(meetingDate))
  }, [meetingDate])

  const coreHodUsers = hodUsers.filter(u => CORE_ATTENDEE_USERNAMES.includes(u.username))
  const coreAdminUsers = adminUsers.filter(u => CORE_ADMIN_ATTENDEE_USERNAMES.includes(u.username))
  const allCoreAttendees = [
    ...coreHodUsers.map(u => ({ id: u.id, hod_name: u.hod_name, username: u.username, department_id: u.department_id })),
    ...coreAdminUsers.map(u => ({ id: u.id, hod_name: u.hod_name, username: u.username, department_id: null as string | null })),
  ]
  const presentAttendees = allCoreAttendees.filter(u => attendance[u.id] === 'present')

  useEffect(() => {
    const defaultMode = (username: string): 'phone' | 'in_person' =>
      username.startsWith('headoffice.') ? 'phone' : 'in_person'

    if (editingMeeting?.attendance?.length) {
      const restored: Record<string, AttendanceStatus> = {}
      const restoredModes: Record<string, 'phone' | 'in_person'> = {}
      for (const u of allCoreAttendees) {
        restored[u.id] = 'absent'
        restoredModes[u.id] = defaultMode(u.username)
      }
      for (const a of editingMeeting.attendance) {
        restored[a.user_id] = a.status
        if (a.attendance_mode) restoredModes[a.user_id] = a.attendance_mode
      }
      setAttendance(restored)
      setAttendanceMode(restoredModes)
      return
    }
    const defaults: Record<string, AttendanceStatus> = {}
    const modeDefaults: Record<string, 'phone' | 'in_person'> = {}
    for (const u of allCoreAttendees) {
      defaults[u.id] = 'absent'
      modeDefaults[u.id] = defaultMode(u.username)
    }
    const secOption = SECRETARY_OPTIONS.find(s =>
      secretaryMode === 'emilly' ? s.username === 'reception.emilly' : s.username === 'reception.patience'
    )
    if (secretaryMode !== 'other' && secOption) {
      const secUser = allCoreAttendees.find(u => u.username === secOption.username)
      if (secUser) defaults[secUser.id] = 'present'
    }
    setAttendance(defaults)
    setAttendanceMode(modeDefaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hodUsers, adminUsers, secretaryMode])

  useEffect(() => {
    if (isEditing) return
    fetch('/api/meetings/outstanding-items')
      .then(r => r.json())
      .then(data => {
        setOutstandingItems(data.items ?? [])
        setOutstandingDate(data.meetingDate)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateAttendance(userId: string, status: AttendanceStatus) {
    setAttendance(prev => ({ ...prev, [userId]: status }))
  }

  function updateAttendanceMode(userId: string, mode: 'phone' | 'in_person') {
    setAttendanceMode(prev => ({ ...prev, [userId]: mode }))
  }

  function addAdditionalAttendee() {
    setAdditionalAttendees(prev => [...prev, { name: '', department: '', reason: '' }])
  }

  function updateAdditionalAttendee(idx: number, field: keyof AdditionalAttendee, val: string) {
    setAdditionalAttendees(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a))
  }

  function removeAdditionalAttendee(idx: number) {
    setAdditionalAttendees(prev => prev.filter((_, i) => i !== idx))
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

  function addActionItem() {
    setActionItems(prev => [...prev, emptyActionItem()])
  }

  function removeActionItem(idx: number) {
    setActionItems(prev => prev.filter((_, i) => i !== idx))
  }

  function getSecretaryUserId(): string | null {
    if (secretaryMode === 'other') return null
    const username = secretaryMode === 'emilly' ? 'reception.emilly' : 'reception.patience'
    return hodUsers.find(u => u.username === username)?.id ?? null
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    const attendanceArr: MeetingAttendee[] = allCoreAttendees.map(u => {
      const dept = departments.find(d => d.id === u.department_id)
      const mode = attendanceMode[u.id]
      return {
        user_id: u.id,
        hod_name: u.hod_name,
        department_slug: dept?.slug ?? '',
        status: attendance[u.id] ?? 'absent',
        ...(mode ? { attendance_mode: mode } : {}),
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

    const filteredAgenda = agendaItems.filter(a => a.trim())
    const filteredDecisions = decisions.filter(d => d.trim())
    const filteredActionItems = actionItems
      .filter(ai => ai.description.trim())
      .map(ai => ({
        ...(ai.id ? { id: ai.id } : {}),
        description: ai.description,
        assignee_type: ai.assignee_type,
        assigned_dept_id: ai.assignee_type === 'department' || ai.assignee_type === 'sub_department' ? ai.assigned_dept_id || null : null,
        assigned_sub_dept: ai.assignee_type === 'sub_department' ? ai.assigned_sub_dept || null : null,
        assigned_user_id: ai.assignee_type === 'individual' ? ai.assigned_user_id || null : null,
        deadline: ai.deadline || null,
        priority: ai.priority,
      }))

    const body = {
      meeting_type: meetingType,
      special_title: meetingType === 'special' ? specialTitle : null,
      date: meetingDate,
      start_time: startTime || null,
      end_time: endTime || null,
      secretary_user_id: getSecretaryUserId(),
      secretary_custom_name: secretaryMode === 'other' ? secretaryCustom : null,
      attendance: attendanceArr,
      additional_attendees: additionalAttendees.filter(a => a.name.trim()),
      agenda: filteredAgenda.map(a => ({ title: a })),
      general_notes: generalNotes || null,
      per_hod_notes: perHodNotesObj,
      decisions: filteredDecisions.map(d => ({ text: d })),
      suggested_next_date: suggestedNextDate || null,
      closing_notes: closingNotes || null,
      action_items: filteredActionItems,
    }

    try {
      const url = isEditing ? `/api/meetings/${editingMeeting!.id}` : '/api/meetings'
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'submit'} meeting`)
      onCreated(isEditing ? editingMeeting!.id : data.id)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Meeting Record' : 'New Meeting Record'}</h1>
      </div>

      {/* Outstanding items reference panel */}
      {outstandingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Outstanding items from {outstandingDate ? new Date(outstandingDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'previous meeting'}
          </h3>
          <div className="space-y-1.5">
            {outstandingItems.map(item => (
              <div key={item.id} className="text-xs text-amber-700 flex items-start gap-2">
                <span className={`px-1.5 rounded text-xs ${
                  item.priority === 'high' ? 'bg-red-100 text-red-600' :
                  item.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {item.priority}
                </span>
                <span>{item.description}</span>
                <span className="text-amber-500 ml-auto shrink-0">
                  {item.assigned_dept?.name ?? item.assigned_user?.hod_name ?? ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Meeting Details */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Meeting Details</h2>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Meeting Title</label>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secretary</label>
          <div className="flex flex-wrap gap-2">
            {(['emilly', 'patience', 'other'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setSecretaryMode(opt)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  secretaryMode === opt ? 'bg-ziwa-50 border-ziwa-300 text-ziwa-700 font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt === 'other' ? 'Someone else' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          {secretaryMode === 'other' && (
            <input
              type="text"
              value={secretaryCustom}
              onChange={e => setSecretaryCustom(e.target.value)}
              placeholder="Secretary name"
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
        </div>
      </section>

      {/* Section 2: Attendance */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
        <div className="space-y-2">
          {allCoreAttendees.map(u => {
            const dept = departments.find(d => d.id === u.department_id)
            const adminUser = coreAdminUsers.find(a => a.id === u.id)
            const currentMode = attendanceMode[u.id] ?? (u.username.startsWith('headoffice.') ? 'phone' : 'in_person')
            return (
              <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{u.hod_name}</span>
                  {dept && <span className="text-xs text-gray-400">{dept.name}</span>}
                  {adminUser?.admin_title && <span className="text-xs text-gray-400">{adminUser.admin_title}</span>}
                  <div className="flex gap-0.5 ml-1">
                    {(['phone', 'in_person'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateAttendanceMode(u.id, m)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                          currentMode === m
                            ? 'bg-ziwa-50 border-ziwa-300 text-ziwa-700'
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {m === 'phone' ? 'Phone' : 'In person'}
                      </button>
                    ))}
                  </div>
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
          <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Attendees</h3>
          {additionalAttendees.map((aa, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input type="text" placeholder="Name" value={aa.name} onChange={e => updateAdditionalAttendee(i, 'name', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <select value={aa.department} onChange={e => updateAdditionalAttendee(i, 'department', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                <option value="External">External</option>
              </select>
              <div className="flex gap-1">
                <input type="text" placeholder="Reason" value={aa.reason} onChange={e => updateAdditionalAttendee(i, 'reason', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={() => removeAdditionalAttendee(i)} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addAdditionalAttendee} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
            + Add attendee
          </button>
        </div>
      </section>

      {/* Section 3: Agenda */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
        {agendaItems.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-sm text-gray-400 mt-2 w-6 text-right">{i + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? e.target.value : a))}
              placeholder="Agenda topic"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {agendaItems.length > 1 && (
              <button type="button" onClick={() => setAgendaItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setAgendaItems(prev => [...prev, ''])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
          + Add agenda item
        </button>
      </section>

      {/* Section 4: General Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">General Notes &amp; Media</h2>
        <textarea
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          placeholder="General meeting notes — key discussions, context, observations"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          rows={5}
        />
      </section>

      {/* Section 5: Per-HOD Speaking Sections (present attendees only) */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">HOD Contributions</h2>
        {presentAttendees.length === 0 ? (
          <p className="text-sm text-gray-400">Mark attendees as present in the Attendance section above to add their contributions.</p>
        ) : (
          <div className="space-y-4">
            {presentAttendees.map(u => {
              const dept = departments.find(d => d.id === u.department_id)
              const adminUser = coreAdminUsers.find(a => a.id === u.id)
              const note = perHodNotes[u.id] ?? { notes: '', did_not_speak: false }
              return (
                <div key={u.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{u.hod_name}</span>
                      {dept && <span className="text-xs text-gray-400 ml-2">{dept.name}</span>}
                      {adminUser?.admin_title && <span className="text-xs text-gray-400 ml-2">{adminUser.admin_title}</span>}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={note.did_not_speak}
                        onChange={e => updatePerHodNote(u.id, 'did_not_speak', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Did not speak
                    </label>
                  </div>
                  {!note.did_not_speak && (
                    <textarea
                      value={note.notes}
                      onChange={e => updatePerHodNote(u.id, 'notes', e.target.value)}
                      placeholder={`What did ${u.hod_name} contribute?`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      rows={2}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 6: Decisions */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Decisions Made</h2>
        {decisions.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={d}
              onChange={e => setDecisions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="Decision"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {decisions.length > 1 && (
              <button type="button" onClick={() => setDecisions(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">&times;</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setDecisions(prev => [...prev, ''])} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
          + Add decision
        </button>
      </section>

      {/* Section 7: Action Items */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
        {actionItems.map((ai, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
              {actionItems.length > 1 && (
                <button type="button" onClick={() => removeActionItem(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              )}
            </div>
            <textarea
              value={ai.description}
              onChange={e => updateActionItem(i, 'description', e.target.value)}
              placeholder="Describe the action item"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignee Type</label>
                <select
                  value={ai.assignee_type}
                  onChange={e => updateActionItem(i, 'assignee_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {ASSIGNEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {(ai.assignee_type === 'department' || ai.assignee_type === 'sub_department') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select
                    value={ai.assigned_dept_id}
                    onChange={e => updateActionItem(i, 'assigned_dept_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {ai.assignee_type === 'sub_department' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sub-department</label>
                  <input
                    type="text"
                    value={ai.assigned_sub_dept}
                    onChange={e => updateActionItem(i, 'assigned_sub_dept', e.target.value)}
                    placeholder="e.g. Carpentry, Night shift"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {ai.assignee_type === 'individual' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Individual</label>
                  <select
                    value={ai.assigned_user_id}
                    onChange={e => updateActionItem(i, 'assigned_user_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
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
        <button type="button" onClick={addActionItem} className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
          + Add action item
        </button>
      </section>

      {/* Section 8: Close */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Close</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Next Meeting Date</label>
          <input type="date" value={suggestedNextDate} onChange={e => setSuggestedNextDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Closing Notes (optional)</label>
          <textarea
            value={closingNotes}
            onChange={e => setClosingNotes(e.target.value)}
            placeholder="Any closing remarks"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={3}
          />
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-ziwa-500 hover:bg-ziwa-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? (isEditing ? 'Saving…' : 'Submitting…') : (isEditing ? 'Save Changes' : 'Submit Meeting Record')}
        </button>
        <button type="button" onClick={onBack} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
