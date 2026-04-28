'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BUILDING_LABELS, MEAL_PLAN_SHORT, formatDate } from '@hod/shared/config/accommodation'
import type { BuildingType } from '@hod/shared/types'

interface SummaryUnit {
  id: string
  name: string
  building: string
  capacity: number
  sort_order: number
}

interface SummaryBooking {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  adults: number
  children: number
  meal_plan: string
  status: string
  special_notes: string | null
  booking_rooms: { unit_id: string; accommodation_units: SummaryUnit }[]
}

interface SummaryData {
  date: string
  bookings: SummaryBooking[]
  units: SummaryUnit[]
  summary: { totalGuests: number; occupiedUnits: number; totalUnits: number }
}

export default function DailySummary() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accommodation/daily-summary?date=${date}`)
      setData(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [date])

  useEffect(() => { const id = requestAnimationFrame(() => fetchSummary()); return () => cancelAnimationFrame(id) }, [fetchSummary])

  function buildWhatsAppText(): string {
    if (!data) return ''
    const lines: string[] = [`*ZIWA RANCH — ROOMING LIST*`, `*${formatDate(data.date)}*`, '']

    const unitBookingMap = new Map<string, SummaryBooking>()
    for (const b of data.bookings) {
      for (const br of b.booking_rooms) {
        unitBookingMap.set(br.unit_id, b)
      }
    }

    const byBuilding = new Map<string, SummaryUnit[]>()
    for (const u of data.units) {
      const list = byBuilding.get(u.building) || []
      list.push(u)
      byBuilding.set(u.building, list)
    }

    for (const [building, bUnits] of byBuilding) {
      lines.push(`*${BUILDING_LABELS[building as BuildingType] ?? building}*`)
      for (const unit of bUnits) {
        const b = unitBookingMap.get(unit.id)
        if (b) {
          const mp = MEAL_PLAN_SHORT[b.meal_plan as keyof typeof MEAL_PLAN_SHORT] || b.meal_plan
          const guests = b.adults + (b.children > 0 ? ` + ${b.children}ch` : '')
          lines.push(`  ${unit.name}: ${b.guest_name} (${guests}, ${mp})`)
        } else {
          lines.push(`  ${unit.name}: —`)
        }
      }
      lines.push('')
    }

    lines.push(`*Total Guests:* ${data.summary.totalGuests}`)
    lines.push(`*Occupancy:* ${data.summary.occupiedUnits}/${data.summary.totalUnits} rooms`)
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildWhatsAppText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleExport() {
    window.open(`/api/accommodation/export?from=${date}&to=${date}&format=csv`, '_blank')
  }

  const tableRows = useMemo(() => {
    if (!data) return null
    const unitBookingMap = new Map<string, SummaryBooking>()
    for (const b of data.bookings) {
      for (const br of b.booking_rooms) unitBookingMap.set(br.unit_id, b)
    }
    const byBuilding = new Map<string, SummaryUnit[]>()
    for (const u of data.units) {
      const list = byBuilding.get(u.building) || []
      list.push(u)
      byBuilding.set(u.building, list)
    }
    const rows: React.ReactNode[] = []
    for (const [building, bUnits] of byBuilding) {
      rows.push(
        <tr key={`hdr-${building}`}>
          <td colSpan={5} className="bg-gray-50 px-4 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">
            {BUILDING_LABELS[building as BuildingType] ?? building}
          </td>
        </tr>
      )
      for (const unit of bUnits) {
        const b = unitBookingMap.get(unit.id)
        rows.push(
          <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 font-medium text-gray-700">{unit.name}</td>
            {b ? (
              <>
                <td className="px-4 py-2 text-gray-800">{b.guest_name}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{formatDate(b.check_in)} → {formatDate(b.check_out)}</td>
                <td className="px-4 py-2 text-gray-600">{b.adults}{b.children > 0 ? ` + ${b.children}ch` : ''}</td>
                <td className="px-4 py-2 text-gray-600">{MEAL_PLAN_SHORT[b.meal_plan as keyof typeof MEAL_PLAN_SHORT] || b.meal_plan}</td>
              </>
            ) : (
              <td colSpan={4} className="px-4 py-2 text-gray-300">—</td>
            )}
          </tr>
        )
      }
    }
    return rows
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
        />
        <button
          onClick={() => setDate(new Date().toISOString().split('T')[0])}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50"
        >
          Today
        </button>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-green-600 hover:text-green-700 border border-green-300 rounded px-3 py-1.5 hover:bg-green-50 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy for WhatsApp'}
        </button>
        <button onClick={handleExport} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalGuests}</p>
              <p className="text-xs text-gray-500 mt-1">Total Guests</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.summary.occupiedUnits}</p>
              <p className="text-xs text-gray-500 mt-1">Rooms Occupied</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalUnits > 0 ? Math.round((data.summary.occupiedUnits / data.summary.totalUnits) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Occupancy</p>
            </div>
          </div>

          {/* Room list */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Room</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Guest</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Dates</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Pax</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Meal</th>
                </tr>
              </thead>
              <tbody>
                {tableRows}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
