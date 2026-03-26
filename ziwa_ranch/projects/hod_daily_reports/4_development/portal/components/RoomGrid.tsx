'use client'

import { ROOM_BUILDINGS } from '@/config/rooms'

export interface RoomData {
  status: 'vacant' | 'occupied' | ''
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

const CONDITION_OPTIONS = ['Good', 'Needs attention', 'Out of order']

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

export default function RoomGrid({ value, onChange, readOnly = false }: RoomGridProps) {
  function updateRoom(slug: string, patch: Partial<RoomData>) {
    const current = value[slug] ?? { status: '' as const }
    const updated = { ...current, ...patch }

    if (patch.status === 'vacant') {
      delete updated.condition
      delete updated.damages
    }

    onChange({ ...value, [slug]: updated })
  }

  function getRoomData(slug: string): RoomData {
    return value[slug] ?? { status: '' }
  }

  const occupiedCount = Object.values(value).filter((r) => r.status === 'occupied').length
  const vacantCount = Object.values(value).filter((r) => r.status === 'vacant').length

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        <span className="text-gray-600">
          Occupied: <span className="font-semibold text-gray-900">{occupiedCount}</span>
        </span>
        <span className="text-gray-600">
          Vacant: <span className="font-semibold text-gray-900">{vacantCount}</span>
        </span>
      </div>

      {ROOM_BUILDINGS.map((building) => (
        <div key={building.building} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {building.building}
          </h3>

          <div className="space-y-3">
            {building.rooms.map((room) => {
              const data = getRoomData(room.slug)
              const isOccupied = data.status === 'occupied'
              const isVacant = data.status === 'vacant'

              return (
                <div
                  key={room.slug}
                  className={`border rounded-lg p-3 space-y-2 ${
                    isOccupied
                      ? 'border-blue-200 bg-blue-50/50'
                      : isVacant
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-800">{room.name}</span>

                    {readOnly ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isOccupied ? 'text-blue-700 bg-blue-100' :
                        isVacant ? 'text-green-700 bg-green-100' :
                        'text-gray-500 bg-gray-100'
                      }`}>
                        {data.status || 'Not set'}
                      </span>
                    ) : (
                      <select
                        value={data.status}
                        onChange={(e) => updateRoom(room.slug, { status: e.target.value as RoomData['status'] })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="vacant">Vacant</option>
                        <option value="occupied">Occupied</option>
                      </select>
                    )}
                  </div>

                  {isOccupied && (
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

                  {isVacant && (
                    <div className="pt-1">
                      <label className="block text-xs text-gray-600 mb-1">Notes</label>
                      {readOnly ? (
                        <p className="text-sm text-gray-800">{data.notes || '-'}</p>
                      ) : (
                        <input
                          type="text"
                          value={data.notes ?? ''}
                          onChange={(e) => updateRoom(room.slug, { notes: e.target.value })}
                          placeholder="e.g. Deep cleaned, ready for guests"
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
