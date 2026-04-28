'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AccommodationUnit, BookingWithUnits, BookingStatus } from '../types'
import {
  ACCOMMODATION_VIEW_DAYS,
  BUILDING_LABELS,
  BOOKING_STATUS_CALENDAR_COLOURS,
  BOOKING_STATUS_LABELS,
  addAccommodationDays,
  formatDateShort,
  getAccommodationToday,
  getAccommodationVisibleRange,
  normaliseAccommodationViewMode,
  type AccommodationDateRangePolicy,
  type AccommodationViewMode,
  type AccommodationVisibleRange,
} from '../config/accommodation'

export interface AccommodationCalendarProps {
  units: AccommodationUnit[]
  bookings: BookingWithUnits[]
  loading?: boolean
  readOnly?: boolean
  onNewBooking?: (defaults?: { unit_id?: string; date?: string }) => void
  onEditBooking?: (id: string) => void
  allowEmptyCellClick?: boolean
  allowExistingBookingClick?: boolean
  rangePolicy?: AccommodationDateRangePolicy
  initialViewMode?: AccommodationViewMode
  initialStartDate?: string
  onVisibleRangeChange?: (range: AccommodationVisibleRange) => void
}

const ALL_VIEW_MODES: readonly AccommodationViewMode[] = ['week', 'fortnight', 'month']
const UNBOUNDED_MIN_DATE = '0001-01-01'
const UNBOUNDED_MAX_DATE = '9999-12-31'

function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

function getUnrestrictedStartDate(now: Date = new Date()): string {
  return addAccommodationDays(getAccommodationToday(now), -1)
}

function getUnrestrictedVisibleRange(
  requestedViewMode: AccommodationViewMode,
  requestedStartDate: string,
  now: Date = new Date(),
): AccommodationVisibleRange {
  const viewMode = normaliseAccommodationViewMode(requestedViewMode)
  const dayCount = ACCOMMODATION_VIEW_DAYS[viewMode]
  return {
    viewMode,
    dayCount,
    startDate: requestedStartDate,
    from: requestedStartDate,
    to: addAccommodationDays(requestedStartDate, dayCount - 1),
    today: getAccommodationToday(now),
    minStartDate: UNBOUNDED_MIN_DATE,
    maxStartDate: UNBOUNDED_MAX_DATE,
    maxVisibleDate: UNBOUNDED_MAX_DATE,
    canGoPrevious: true,
    canGoNext: true,
  }
}

function getDayStrings(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addAccommodationDays(startDate, index))
}

export function AccommodationCalendar({
  units,
  bookings,
  loading = false,
  readOnly = false,
  onNewBooking,
  onEditBooking,
  allowEmptyCellClick,
  allowExistingBookingClick,
  rangePolicy,
  initialViewMode,
  initialStartDate,
  onVisibleRangeChange,
}: AccommodationCalendarProps) {
  const [viewMode, setViewMode] = useState<AccommodationViewMode>(() => (
    normaliseAccommodationViewMode(initialViewMode ?? rangePolicy?.defaultViewMode ?? 'fortnight', rangePolicy)
  ))
  const [startDate, setStartDate] = useState<string>(() => (
    initialStartDate ?? (rangePolicy ? getAccommodationToday(new Date()) : getUnrestrictedStartDate(new Date()))
  ))

  const visibleRange = useMemo(
    () => (
      rangePolicy
        ? getAccommodationVisibleRange(rangePolicy, viewMode, startDate)
        : getUnrestrictedVisibleRange(viewMode, startDate)
    ),
    [rangePolicy, startDate, viewMode],
  )

  useEffect(() => {
    if (visibleRange.viewMode !== viewMode) {
      setViewMode(visibleRange.viewMode)
    }
    if (visibleRange.startDate !== startDate) {
      setStartDate(visibleRange.startDate)
    }
  }, [startDate, viewMode, visibleRange.startDate, visibleRange.viewMode])

  useEffect(() => {
    onVisibleRangeChange?.(visibleRange)
  }, [onVisibleRangeChange, visibleRange])

  const dayStrings = useMemo(
    () => getDayStrings(visibleRange.startDate, visibleRange.dayCount),
    [visibleRange.dayCount, visibleRange.startDate],
  )

  const unitsByBuilding = useMemo(() => {
    const map = new Map<string, AccommodationUnit[]>()
    for (const unit of units) {
      const list = map.get(unit.building) || []
      list.push(unit)
      map.set(unit.building, list)
    }
    return map
  }, [units])

  const bookingsByUnit = useMemo(() => {
    const map = new Map<string, BookingWithUnits[]>()
    for (const booking of bookings) {
      for (const room of booking.booking_rooms ?? []) {
        const unitId = room.unit_id ?? (room as unknown as { accommodation_units: { id: string } }).accommodation_units?.id
        if (!unitId) continue
        const list = map.get(unitId) || []
        list.push(booking)
        map.set(unitId, list)
      }
    }
    return map
  }, [bookings])

  const availableViewModes = rangePolicy?.allowedViewModes ?? ALL_VIEW_MODES
  const resetStartDate = rangePolicy ? visibleRange.today : getUnrestrictedStartDate(new Date())
  const canCreateFromCalendar = (allowEmptyCellClick ?? !readOnly) && Boolean(onNewBooking)
  const canOpenExistingBookings = (allowExistingBookingClick ?? !readOnly) && Boolean(onEditBooking)
  const legendStatuses: BookingStatus[] = ['tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'hod_pending']

  function handleViewModeChange(nextViewMode: AccommodationViewMode) {
    setViewMode(nextViewMode)
  }

  function navigate(direction: number) {
    const requestedStartDate = addAccommodationDays(visibleRange.startDate, direction * visibleRange.dayCount)
    setStartDate(
      rangePolicy
        ? getAccommodationVisibleRange(rangePolicy, visibleRange.viewMode, requestedStartDate).startDate
        : requestedStartDate,
    )
  }

  function goToToday() {
    setStartDate(resetStartDate)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {availableViewModes.map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                visibleRange.viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'fortnight' ? '2 Weeks' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            disabled={!visibleRange.canGoPrevious}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            disabled={!visibleRange.canGoNext}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>

        <span className="text-sm font-medium text-gray-700">
          {formatDateShort(dayStrings[0])} — {formatDateShort(dayStrings[dayStrings.length - 1])}
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        {loading && bookings.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading bookings…</div>
        ) : (
          <table className="w-full text-xs border-collapse" style={{ minWidth: visibleRange.dayCount * 44 + 160 }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-600 font-semibold" style={{ minWidth: 160 }}>
                  Room
                </th>
                {dayStrings.map((dateStr) => {
                  const day = parseDateStr(dateStr)
                  const isToday = dateStr === visibleRange.today
                  const isSunday = day.getDay() === 0

                  return (
                    <th
                      key={dateStr}
                      className={`border-b border-r border-gray-200 px-1 py-2 text-center font-medium ${
                        isToday ? 'bg-ziwa-50 text-ziwa-700' : isSunday ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
                      }`}
                      style={{ minWidth: 44 }}
                    >
                      <div>{day.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</div>
                      <div className="font-semibold">{day.getDate()}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from(unitsByBuilding.entries()).map(([building, buildingUnits]) => (
                <BuildingGroup
                  key={building}
                  building={building}
                  units={buildingUnits}
                  dayStrings={dayStrings}
                  dayCount={visibleRange.dayCount}
                  todayStr={visibleRange.today}
                  bookingsByUnit={bookingsByUnit}
                  canCreateFromCalendar={canCreateFromCalendar}
                  canOpenExistingBookings={canOpenExistingBookings}
                  onNewBooking={onNewBooking}
                  onEditBooking={onEditBooking}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {legendStatuses.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded ${BOOKING_STATUS_CALENDAR_COLOURS[status]} border`} />
            {BOOKING_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

function BuildingGroup({
  building,
  units: buildingUnits,
  dayStrings,
  dayCount,
  todayStr,
  bookingsByUnit,
  canCreateFromCalendar,
  canOpenExistingBookings,
  onNewBooking,
  onEditBooking,
}: {
  building: string
  units: AccommodationUnit[]
  dayStrings: string[]
  dayCount: number
  todayStr: string
  bookingsByUnit: Map<string, BookingWithUnits[]>
  canCreateFromCalendar: boolean
  canOpenExistingBookings: boolean
  onNewBooking?: (defaults?: { unit_id?: string; date?: string }) => void
  onEditBooking?: (id: string) => void
}) {
  return (
    <>
      <tr>
        <td
          colSpan={dayCount + 1}
          className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide"
        >
          {BUILDING_LABELS[building as keyof typeof BUILDING_LABELS] ?? building}
        </td>
      </tr>
      {buildingUnits.map((unit) => {
        const unitBookings = bookingsByUnit.get(unit.id) ?? []
        return (
          <tr key={unit.id} className="hover:bg-gray-50/50">
            <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">
              {unit.name}
              <span className="ml-1 text-gray-400 font-normal">({unit.capacity})</span>
            </td>
            {dayStrings.map((dateStr) => {
              const isToday = dateStr === todayStr
              const booking = unitBookings.find((current) => current.check_in <= dateStr && current.check_out > dateStr)
              const isCheckIn = booking?.check_in === dateStr
              const isLastNight = booking ? addAccommodationDays(booking.check_out, -1) === dateStr : false
              const statusColour = booking
                ? BOOKING_STATUS_CALENDAR_COLOURS[booking.status as BookingStatus] ?? 'bg-amber-100 border-amber-300 text-amber-800'
                : ''

              return (
                <td
                  key={dateStr}
                  className={`border-b border-r border-gray-100 p-0 relative ${isToday ? 'bg-ziwa-50/30' : ''}`}
                  style={{ minWidth: 44, height: 32 }}
                >
                  {booking ? (
                    canOpenExistingBookings && onEditBooking ? (
                      <button
                        onClick={() => onEditBooking(booking.id)}
                        className={`absolute inset-y-0.5 ${isCheckIn ? 'left-0.5 rounded-l' : 'left-0'} ${isLastNight ? 'right-0.5 rounded-r' : 'right-0'} ${statusColour} border flex items-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
                        title={`${booking.guest_name} (${booking.status})`}
                      >
                        {isCheckIn && (
                          <span className="px-1 truncate font-medium">
                            {booking.guest_name}
                            {booking.status === 'hod_pending' && ' (Pending)'}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div
                        className={`absolute inset-y-0.5 ${isCheckIn ? 'left-0.5 rounded-l' : 'left-0'} ${isLastNight ? 'right-0.5 rounded-r' : 'right-0'} ${statusColour} border flex items-center overflow-hidden`}
                        title={`${booking.guest_name} (${booking.status})`}
                      >
                        {isCheckIn && (
                          <span className="px-1 truncate font-medium">
                            {booking.guest_name}
                            {booking.status === 'hod_pending' && ' (Pending)'}
                          </span>
                        )}
                      </div>
                    )
                  ) : canCreateFromCalendar && onNewBooking ? (
                    <button
                      onClick={() => onNewBooking({ unit_id: unit.id, date: dateStr })}
                      className="absolute inset-0 hover:bg-gray-100 transition-colors cursor-pointer"
                    />
                  ) : (
                    <div className="absolute inset-0" />
                  )}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
