'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AccommodationCalendar } from '@hod/shared/components/AccommodationCalendar'
import { addAccommodationDays, getAccommodationToday, type AccommodationVisibleRange } from '@hod/shared/config/accommodation'
import type { AccommodationUnit, BookingWithUnits } from '@hod/shared/types'

interface Props {
  units: AccommodationUnit[]
  refreshKey: number
  onNewBooking: (defaults?: { unit_id?: string; date?: string }) => void
  onEditBooking: (id: string) => void
}

export default function CalendarView({ units, refreshKey, onNewBooking, onEditBooking }: Props) {
  const [bookings, setBookings] = useState<BookingWithUnits[]>([])
  const [loading, setLoading] = useState(true)
  const initialVisibleRange = useMemo<AccommodationVisibleRange>(() => {
    const startDate = addAccommodationDays(getAccommodationToday(new Date()), -1)
    return {
      viewMode: 'fortnight',
      dayCount: 14,
      startDate,
      from: startDate,
      to: addAccommodationDays(startDate, 13),
      today: getAccommodationToday(new Date()),
      minStartDate: '0001-01-01',
      maxStartDate: '9999-12-31',
      maxVisibleDate: '9999-12-31',
      canGoPrevious: true,
      canGoNext: true,
    }
  }, [])
  const [visibleRange, setVisibleRange] = useState<AccommodationVisibleRange>(initialVisibleRange)

  const handleVisibleRangeChange = useCallback((nextRange: AccommodationVisibleRange) => {
    setVisibleRange((currentRange) => (
      currentRange.from === nextRange.from &&
      currentRange.to === nextRange.to &&
      currentRange.startDate === nextRange.startDate &&
      currentRange.viewMode === nextRange.viewMode
        ? currentRange
        : nextRange
    ))
  }, [])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accommodation/bookings?from=${visibleRange.from}&to=${visibleRange.to}&limit=500`)
      const data = await res.json()
      setBookings(data.bookings ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [visibleRange.from, visibleRange.to])

  useEffect(() => { const id = requestAnimationFrame(() => fetchBookings()); return () => cancelAnimationFrame(id) }, [fetchBookings, refreshKey])

  return (
    <>
      <AccommodationCalendar
        units={units}
        bookings={bookings}
        loading={loading}
        readOnly={false}
        onNewBooking={onNewBooking}
        onEditBooking={onEditBooking}
        initialViewMode={initialVisibleRange.viewMode}
        initialStartDate={initialVisibleRange.startDate}
        onVisibleRangeChange={handleVisibleRangeChange}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={() => window.open(`/api/accommodation/export?from=${visibleRange.from}&to=${visibleRange.to}&format=csv`, '_blank')}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
    </>
  )
}
