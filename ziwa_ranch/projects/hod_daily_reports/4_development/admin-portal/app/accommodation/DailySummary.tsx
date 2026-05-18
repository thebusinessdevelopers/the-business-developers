'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BOOKING_STATUS_LABELS, BUILDING_LABELS, MEAL_PLAN_LABELS, MEAL_PLAN_SHORT, formatDate } from '@hod/shared/config/accommodation'
import { createRoomingWhatsappRow, formatRoomingWhatsappMessage } from '@hod/shared/lib/rooming-whatsapp'
import type { RoomingWhatsappRow } from '@hod/shared/lib/rooming-whatsapp'
import type { BookingStatus, BuildingType, MealPlan, RoomBasketItem } from '@hod/shared/types'

interface SummaryUnit {
  id: string
  name: string
  building: string
  category?: string | null
  capacity: number
  max_concurrent_bookings?: number | null
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
  booking_rooms: SummaryBookingRoom[]
}

interface SummaryData {
  date: string
  bookings: SummaryBooking[]
  units: SummaryUnit[]
  summary: { totalGuests: number; occupiedUnits: number; totalUnits: number }
}

interface SummaryBookingRoom {
  unit_id: string
  room_config?: RoomBasketItem | null
  accommodation_units: SummaryUnit
}

type UnitBooking = { booking: SummaryBooking; room: SummaryBookingRoom }

function isSharedCapacityUnit(unit: SummaryUnit): boolean {
  return unit.category === 'campsite' || unit.building === 'campsite' || (unit.max_concurrent_bookings ?? 1) > 1
}

function buildUnitBookingsMap(bookings: SummaryBooking[]): Map<string, UnitBooking[]> {
  const unitBookingsMap = new Map<string, UnitBooking[]>()
  for (const booking of bookings) {
    for (const room of booking.booking_rooms) {
      const bookings = unitBookingsMap.get(room.unit_id) ?? []
      bookings.push({ booking, room })
      unitBookingsMap.set(room.unit_id, bookings)
    }
  }
  return unitBookingsMap
}

function getRoomPaxLabel(roomConfig?: RoomBasketItem | null): string {
  if (!roomConfig) return 'per-room pax not recorded'
  return `${roomConfig.adults}${roomConfig.children > 0 ? ` + ${roomConfig.children}ch` : ''}`
}

function getRoomWhatsappPaxLabel(roomConfig?: RoomBasketItem | null): string | undefined {
  return roomConfig ? undefined : 'per-room pax not recorded'
}

function getRoomConfigurationLabel(roomConfig?: RoomBasketItem | null): string {
  return roomConfig?.room_configuration_label?.trim() || 'per-room pax not recorded'
}

function getRoomMealPlan(booking: SummaryBooking, room: SummaryBookingRoom): string {
  return room.room_config?.meal_plan ?? booking.meal_plan
}

function formatMealPlanLabel(mealPlan: string): string {
  return MEAL_PLAN_LABELS[mealPlan as MealPlan] ?? mealPlan
}

function formatMealPlanShort(mealPlan: string): string {
  return MEAL_PLAN_SHORT[mealPlan as MealPlan] || mealPlan
}

function getStayNight(date: string, booking: SummaryBooking): string {
  const checkIn = new Date(`${booking.check_in}T00:00:00`).getTime()
  const checkOut = new Date(`${booking.check_out}T00:00:00`).getTime()
  const stayDate = new Date(`${date}T00:00:00`).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const nights = Math.max(1, Math.round((checkOut - checkIn) / dayMs))
  const night = Math.min(nights, Math.max(1, Math.round((stayDate - checkIn) / dayMs) + 1))
  return `${night} of ${nights}`
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
    const unitBookingsMap = buildUnitBookingsMap(data.bookings)
    const rows: RoomingWhatsappRow[] = []

    const byBuilding = new Map<string, SummaryUnit[]>()
    for (const u of data.units) {
      const list = byBuilding.get(u.building) || []
      list.push(u)
      byBuilding.set(u.building, list)
    }

    for (const [, bUnits] of byBuilding) {
      for (const unit of bUnits) {
        const unitBookings = unitBookingsMap.get(unit.id) ?? []
        if (unitBookings.length > 0) {
          const bookingsToShow = isSharedCapacityUnit(unit) ? unitBookings : unitBookings.slice(0, 1)
          for (const { booking, room } of bookingsToShow) {
            rows.push(createRoomingWhatsappRow({
              roomName: unit.name,
              guestName: booking.guest_name,
              adults: room.room_config?.adults ?? 0,
              children: room.room_config?.children ?? 0,
              paxLabel: getRoomWhatsappPaxLabel(room.room_config),
              roomConfigurationLabel: getRoomConfigurationLabel(room.room_config),
              mealPlan: formatMealPlanLabel(getRoomMealPlan(booking, room)),
              stayNight: getStayNight(data.date, booking),
              status: BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status,
              notes: room.room_config?.notes || booking.special_notes,
            }))
          }
        }
      }
    }

    return formatRoomingWhatsappMessage({ date: data.date, rows })
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
    const unitBookingsMap = buildUnitBookingsMap(data.bookings)
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
        const unitBookings = unitBookingsMap.get(unit.id) ?? []
        const bookingsToShow = isSharedCapacityUnit(unit) ? unitBookings : unitBookings.slice(0, 1)
        if (bookingsToShow.length === 0) {
          rows.push(
            <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2 font-medium text-gray-700">{unit.name}</td>
              <td colSpan={4} className="px-4 py-2 text-gray-300">—</td>
            </tr>
          )
          continue
        }
        for (const [index, b] of bookingsToShow.entries()) {
          rows.push(
            <tr key={`${unit.id}-${b.booking.id}`} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2 font-medium text-gray-700">
                {unit.name}{isSharedCapacityUnit(unit) && bookingsToShow.length > 1 ? ` #${index + 1}` : ''}
              </td>
              <td className="px-4 py-2 text-gray-800">{b.booking.guest_name}</td>
              <td className="px-4 py-2 text-gray-500 text-xs">{formatDate(b.booking.check_in)} → {formatDate(b.booking.check_out)}</td>
              <td className="px-4 py-2 text-gray-600">{getRoomPaxLabel(b.room.room_config)}</td>
              <td className="px-4 py-2 text-gray-600">{formatMealPlanShort(getRoomMealPlan(b.booking, b.room))}</td>
            </tr>
          )
        }
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
