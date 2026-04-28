'use client'

import { useState } from 'react'
import type { AccommodationUnit, UnitStatus } from '@hod/shared/types'
import { BUILDING_LABELS } from '@hod/shared/config/accommodation'

interface Props {
  units: AccommodationUnit[]
  onRefresh: () => void
}

const STATUS_LABELS: Record<UnitStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
}

const STATUS_STYLES: Record<UnitStatus, string> = {
  active: 'bg-green-50 border-green-200 text-green-700',
  inactive: 'bg-gray-50 border-gray-200 text-gray-500',
  maintenance: 'bg-amber-50 border-amber-200 text-amber-700',
}

export default function RoomManagement({ units, onRefresh }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)

  const byBuilding = new Map<string, AccommodationUnit[]>()
  for (const u of units) {
    const list = byBuilding.get(u.building) || []
    list.push(u)
    byBuilding.set(u.building, list)
  }

  async function updateStatus(unitId: string, status: UnitStatus) {
    setUpdating(unitId)
    try {
      await fetch('/api/accommodation/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unitId, status }),
      })
      onRefresh()
      window.location.reload()
    } catch { /* silent */ }
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Manage room status. Activate A-Frame units when commissioned, or set rooms to maintenance.
      </p>

      {Array.from(byBuilding.entries()).map(([building, bUnits]) => (
        <div key={building} className="space-y-2">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
            {BUILDING_LABELS[building as keyof typeof BUILDING_LABELS] ?? building}
          </h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Category</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Capacity</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Rate Category</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bUnits.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.category}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.capacity}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.rate_category}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_STYLES[u.status]}`}>
                        {STATUS_LABELS[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === 'inactive' && (
                          <button
                            onClick={() => updateStatus(u.id, 'active')}
                            disabled={updating === u.id}
                            className="text-xs text-green-600 hover:text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button
                            onClick={() => updateStatus(u.id, 'maintenance')}
                            disabled={updating === u.id}
                            className="text-xs text-amber-600 hover:text-amber-700 border border-amber-300 rounded px-2 py-1 hover:bg-amber-50 disabled:opacity-50"
                          >
                            Maintenance
                          </button>
                        )}
                        {u.status === 'maintenance' && (
                          <button
                            onClick={() => updateStatus(u.id, 'active')}
                            disabled={updating === u.id}
                            className="text-xs text-green-600 hover:text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )}
                        {u.status !== 'inactive' && (
                          <button
                            onClick={() => updateStatus(u.id, 'inactive')}
                            disabled={updating === u.id}
                            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
