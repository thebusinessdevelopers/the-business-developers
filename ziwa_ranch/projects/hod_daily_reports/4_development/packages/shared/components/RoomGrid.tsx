'use client'

import { ROOM_BUILDINGS } from '../config/rooms'

export type RoomStatus = 'vacant' | 'occupied' | 'maintenance' | 'unavailable' | ''

export interface RoomData {
  status: RoomStatus
  condition?: string
  damages?: string
  notes?: string
}

export type RoomsValue = Record<string, RoomData>

interface RoomGridProps {
  value: RoomsValue
  onChange: (updated: RoomsValue) => void
  readOnly?: boolean
}

const STATUSES: { key: RoomStatus; label: string; color: string; bgActive: string; border: string }[] = [
  { key: 'occupied', label: 'Occupied', color: 'text-red-600', bgActive: 'bg-red-100 border-red-300', border: 'border-red-200 bg-red-50/50' },
  { key: 'vacant', label: 'Vacant', color: 'text-green-600', bgActive: 'bg-green-100 border-green-300', border: 'border-green-200 bg-green-50/50' },
  { key: 'maintenance', label: 'Maintenance', color: 'text-amber-600', bgActive: 'bg-amber-100 border-amber-300', border: 'border-amber-200 bg-amber-50/50' },
  { key: 'unavailable', label: 'Unavailable', color: 'text-red-600', bgActive: 'bg-red-100 border-red-300', border: 'border-red-200 bg-red-50/50' },
]

function StatusIcon({ status, className = 'w-5 h-5' }: { status: RoomStatus; className?: string }) {
  switch (status) {
    case 'occupied':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} text-red-600`}>
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      )
    case 'vacant':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} text-green-600`}>
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      )
    case 'maintenance':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} text-amber-600`}>
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      )
    case 'unavailable':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} text-red-600`}>
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
        </svg>
      )
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`${className} text-gray-400`}>
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
      )
  }
}

const CONDITION_OPTIONS = ['Good', 'Needs attention', 'Out of order']

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

export default function RoomGrid({ value, onChange, readOnly = false }: RoomGridProps) {
  function updateRoom(slug: string, patch: Partial<RoomData>) {
    const current = value[slug] ?? { status: '' as const }
    const updated = { ...current, ...patch }

    if (patch.status && patch.status !== 'occupied') {
      delete updated.condition
      delete updated.damages
    }

    onChange({ ...value, [slug]: updated })
  }

  function toggleStatus(slug: string, newStatus: RoomStatus) {
    const current = value[slug]?.status
    updateRoom(slug, { status: current === newStatus ? '' : newStatus })
  }

  function getRoomData(slug: string): RoomData {
    return value[slug] ?? { status: '' }
  }

  const counts: Record<string, number> = { occupied: 0, vacant: 0, maintenance: 0, unavailable: 0 }
  for (const r of Object.values(value)) {
    if (r.status && r.status in counts) counts[r.status]++
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {STATUSES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <StatusIcon status={s.key} className="w-4 h-4" />
            <span className="text-gray-700">{s.label} ({counts[s.key]})</span>
          </span>
        ))}
      </div>

      {ROOM_BUILDINGS.map((building) => (
        <div key={building.building} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {building.building}
          </h3>

          <div className="space-y-3">
            {building.rooms.map((room) => {
              const data = getRoomData(room.slug)
              const statusMeta = STATUSES.find((s) => s.key === data.status)
              const borderClass = statusMeta?.border ?? 'border-gray-200 bg-gray-50'

              return (
                <div key={room.slug} className={`border rounded-lg p-3 space-y-2 ${borderClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-800">{room.name}</span>

                    {readOnly ? (
                      <span className="flex items-center gap-1.5">
                        <StatusIcon status={data.status as RoomStatus} className="w-4 h-4" />
                        <span className="text-xs font-medium text-gray-700">{statusMeta?.label ?? 'Not set'}</span>
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        {STATUSES.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleStatus(room.slug, s.key)}
                            title={s.label}
                            className={`p-1.5 rounded-md border transition-colors ${
                              data.status === s.key
                                ? s.bgActive
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <StatusIcon status={s.key} className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {data.status === 'occupied' && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Condition {!readOnly && <span className="text-red-500">*</span>}
                        </label>
                        {readOnly ? (
                          <p className="text-sm text-gray-800">{data.condition || '-'}</p>
                        ) : (
                          <select
                            value={data.condition ?? ''}
                            onChange={(e) => updateRoom(room.slug, { condition: e.target.value })}
                            className={inputClass}
                          >
                            <option value="">Select condition...</option>
                            {CONDITION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Damages or missing items</label>
                        {readOnly ? (
                          <p className="text-sm text-gray-800">{data.damages || '-'}</p>
                        ) : (
                          <input
                            type="text"
                            value={data.damages ?? ''}
                            onChange={(e) => updateRoom(room.slug, { damages: e.target.value })}
                            placeholder="e.g. Towel missing, lamp broken"
                            className={inputClass}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Notes</label>
                        {readOnly ? (
                          <p className="text-sm text-gray-800">{data.notes || '-'}</p>
                        ) : (
                          <input
                            type="text"
                            value={data.notes ?? ''}
                            onChange={(e) => updateRoom(room.slug, { notes: e.target.value })}
                            placeholder="Any observations..."
                            className={inputClass}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {(data.status === 'vacant' || data.status === 'maintenance' || data.status === 'unavailable') && (
                    <div className="pt-1">
                      <label className="block text-xs text-gray-600 mb-1">Notes</label>
                      {readOnly ? (
                        <p className="text-sm text-gray-800">{data.notes || '-'}</p>
                      ) : (
                        <input
                          type="text"
                          value={data.notes ?? ''}
                          onChange={(e) => updateRoom(room.slug, { notes: e.target.value })}
                          placeholder={
                            data.status === 'maintenance' ? 'What maintenance is needed...' :
                            data.status === 'unavailable' ? 'Reason room is unavailable...' :
                            'e.g. Deep cleaned, ready for guests'
                          }
                          className={inputClass}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
