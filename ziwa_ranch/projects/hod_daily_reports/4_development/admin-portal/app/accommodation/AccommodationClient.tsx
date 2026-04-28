'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { AccommodationUnit, AccommodationRate } from '@hod/shared/types'

const CalendarView = dynamic(() => import('./CalendarView'), { loading: () => <TabLoader /> })
const BookingForm = dynamic(() => import('./BookingForm'))
const DailySummary = dynamic(() => import('./DailySummary'), { loading: () => <TabLoader /> })
const ChangeRequestQueue = dynamic(() => import('./ChangeRequestQueue'), { loading: () => <TabLoader /> })
const RoomManagement = dynamic(() => import('./RoomManagement'), { loading: () => <TabLoader /> })

function TabLoader() {
  return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
}

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; retryKey: number }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, retryKey: 0 }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Failed to load this tab.{' '}
          <button className="underline" onClick={() => this.setState(s => ({ hasError: false, retryKey: s.retryKey + 1 }))}>Retry</button>
        </div>
      )
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>
  }
}

type AccTab = 'calendar' | 'daily' | 'requests' | 'rooms'

interface Props {
  adminId: string
  units: AccommodationUnit[]
  rates: AccommodationRate[]
}

export default function AccommodationClient({ adminId, units, rates }: Props) {
  const [activeTab, setActiveTab] = useState<AccTab>('calendar')
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [newBookingDefaults, setNewBookingDefaults] = useState<{ unit_id?: string; date?: string }>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())
  const rateYears = React.useMemo(
    () => Array.from(new Set(rates.map((r) => r.year))).sort((a, b) => b - a),
    [rates],
  )
  const filteredRates = React.useMemo(
    () => rates.filter((r) => r.year === selectedYear),
    [rates, selectedYear],
  )

  useEffect(() => {
    fetch('/api/accommodation/bookings?status=hod_pending&count_only=1')
      .then(r => r.json())
      .then(d => setPendingCount(d.count ?? 0))
      .catch(() => {})
  }, [refreshKey])

  function openNewBooking(defaults?: { unit_id?: string; date?: string }) {
    setNewBookingDefaults(defaults ?? {})
    setEditingBookingId(null)
    setShowNewBooking(true)
  }

  function openEditBooking(id: string) {
    setShowNewBooking(false)
    setEditingBookingId(id)
  }

  function closeForm() {
    setShowNewBooking(false)
    setEditingBookingId(null)
    setRefreshKey((k) => k + 1)
  }

  const tabs: { key: AccTab; label: string; badge?: number }[] = [
    { key: 'calendar', label: 'Calendar', badge: pendingCount },
    { key: 'daily', label: 'Daily Summary' },
    { key: 'requests', label: 'Change Requests' },
    { key: 'rooms', label: 'Room Management' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accommodation</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            Rates year
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
            >
              {(rateYears.length > 0 ? rateYears : [selectedYear]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => openNewBooking()}
            className="bg-ziwa-500 hover:bg-ziwa-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Booking
          </button>
        </div>
      </div>

      <details className="border border-gray-200 rounded-lg">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800">
          Rates reference ({selectedYear}) — {filteredRates.length} row{filteredRates.length !== 1 ? 's' : ''}
        </summary>
        <div className="border-t border-gray-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Category</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Meal</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Type</th>
                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Adult</th>
                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Child</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRates.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-1.5 text-gray-700">{r.rate_category}</td>
                  <td className="px-3 py-1.5 text-gray-500 uppercase">{r.meal_plan}</td>
                  <td className="px-3 py-1.5 text-gray-500 uppercase">{r.rate_type}</td>
                  <td className="px-3 py-1.5 text-right text-gray-700">{r.adult_rate != null ? `$${r.adult_rate}` : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-700">{r.child_rate != null ? `$${r.child_rate}` : '—'}</td>
                </tr>
              ))}
              {filteredRates.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-center text-gray-400" colSpan={5}>No rates for {selectedYear}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-ziwa-600 border-b-2 border-ziwa-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                {tab.badge} pending
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && (
        <TabErrorBoundary>
          <CalendarView
            units={units.filter((u) => u.status !== 'inactive')}
            refreshKey={refreshKey}
            onNewBooking={openNewBooking}
            onEditBooking={openEditBooking}
          />
        </TabErrorBoundary>
      )}

      {activeTab === 'daily' && <TabErrorBoundary><DailySummary /></TabErrorBoundary>}
      {activeTab === 'requests' && <TabErrorBoundary><ChangeRequestQueue /></TabErrorBoundary>}
      {activeTab === 'rooms' && <TabErrorBoundary><RoomManagement units={units} onRefresh={() => setRefreshKey((k) => k + 1)} /></TabErrorBoundary>}

      {(showNewBooking || editingBookingId) && (
        <BookingForm
          adminId={adminId}
          units={units.filter((u) => u.status === 'active')}
          rates={rates}
          bookingId={editingBookingId}
          defaults={newBookingDefaults}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
