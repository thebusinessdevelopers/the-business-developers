'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MeetingListItem, Meeting, MeetingActionItem } from '@/types'
import {
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLOURS,
} from '@hod/shared/config/meetings'
import MeetingForm from './MeetingForm'
import MeetingDetailView from './MeetingDetailView'
import DelegateForm from './DelegateForm'

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
  role: string
}

interface AdminUserRow {
  id: string
  hod_name: string
  username: string
  admin_title: string | null
}

interface MeetingsClientProps {
  adminId: string
  adminName: string
  departments: Department[]
  hodUsers: HodUser[]
  adminUsers: AdminUserRow[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type ViewMode = 'list' | 'new' | 'delegate' | 'detail'
type FilterTab = 'all' | 'draft' | 'submitted' | 'approved'

export default function MeetingsClient({
  adminId,
  adminName,
  departments,
  hodUsers,
  adminUsers,
}: MeetingsClientProps) {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    const statusParam = filterTab === 'all' ? '' : `&status=${filterTab}`
    const res = await fetch(`/api/meetings?limit=50${statusParam}`)
    const data = await res.json()
    setMeetings(data.meetings ?? [])
    setLoading(false)
  }, [filterTab])

  useEffect(() => {
    const id = requestAnimationFrame(() => fetchMeetings())
    return () => cancelAnimationFrame(id)
  }, [fetchMeetings])

  function handleNewMeetingCreated(id: string) {
    setViewMode('detail')
    setActiveMeetingId(id)
    fetchMeetings()
  }

  if (viewMode === 'delegate') {
    return (
      <DelegateForm
        hodUsers={hodUsers}
        onBack={() => setViewMode('list')}
        onDelegated={() => { setViewMode('list'); fetchMeetings() }}
      />
    )
  }

  if (viewMode === 'new') {
    return (
      <MeetingForm
        adminId={adminId}
        adminName={adminName}
        departments={departments}
        hodUsers={hodUsers}
        adminUsers={adminUsers}
        onBack={() => setViewMode('list')}
        onCreated={handleNewMeetingCreated}
      />
    )
  }

  if (viewMode === 'detail' && activeMeetingId) {
    return (
      <MeetingDetailView
        meetingId={activeMeetingId}
        adminId={adminId}
        adminName={adminName}
        departments={departments}
        hodUsers={hodUsers}
        adminUsers={adminUsers}
        onBack={() => { setViewMode('list'); fetchMeetings() }}
        onDeleted={() => { setViewMode('list'); fetchMeetings() }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">HOD meeting records and action items.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('delegate')}
            className="border border-ziwa-300 text-ziwa-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-ziwa-50 transition-colors"
          >
            Delegate to Secretary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('new')}
            className="bg-ziwa-500 hover:bg-ziwa-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            New Meeting
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {(['all', 'draft', 'submitted', 'approved'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              filterTab === tab
                ? 'text-ziwa-600 border-b-2 border-ziwa-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'draft' ? 'Delegated' : tab === 'submitted' ? 'Pending Review' : 'Approved'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Loading meetings…</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No meetings found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {meetings.map(m => {
            const presentCount = (m.attendance ?? []).filter(a => a.status === 'present').length
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setActiveMeetingId(m.id); setViewMode('detail') }}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(m.date)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="capitalize">{m.meeting_type}{m.special_title ? `: ${m.special_title}` : ''}</span>
                    {m.status === 'draft' ? (
                      <span className="text-amber-600">Awaiting secretary</span>
                    ) : (
                      <>
                        <span>{presentCount} attended</span>
                        {(m.action_item_count ?? 0) > 0 && (
                          <span>{m.action_item_count} action items</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-xs border rounded px-2 py-0.5 ${MEETING_STATUS_COLOURS[m.status] ?? ''}`}>
                  {m.status === 'draft' ? 'Delegated' : MEETING_STATUS_LABELS[m.status]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
