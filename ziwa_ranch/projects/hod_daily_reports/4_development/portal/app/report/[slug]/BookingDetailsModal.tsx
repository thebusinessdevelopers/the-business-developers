'use client'

import {
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_COLOURS,
  BOOKING_STATUS_LABELS,
  MEAL_PLAN_LABELS,
  GUEST_CATEGORY_LABELS,
  formatDate,
  calculateActivityLineTotal,
} from '@hod/shared/config/accommodation'
import type { BookingStatus, BookingWithUnits, BookingActivity, GuestCategory } from '@hod/shared/types'

interface BookingWithActivities extends BookingWithUnits {
  booking_activities?: BookingActivity[]
}

interface Props {
  booking: BookingWithActivities
  onClose: () => void
}

export default function BookingDetailsModal({ booking, onClose }: Props) {
  const rooms = booking.booking_rooms ?? []
  const status = booking.status as BookingStatus

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{booking.guest_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {booking.is_private ? 'Private booking' : booking.company_name ? `Company: ${booking.company_name}` : 'Operational booking'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={`text-xs border rounded px-2 py-1 font-medium ${BOOKING_STATUS_COLOURS[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              {BOOKING_STATUS_LABELS[status] ?? booking.status}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(booking.check_in)} to {formatDate(booking.check_out)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Guests</p>
              <p className="font-medium text-gray-900">
                {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                {booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Meal Plan</p>
              <p className="font-medium text-gray-900">{MEAL_PLAN_LABELS[booking.meal_plan]}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Source</p>
              <p className="font-medium text-gray-900">{BOOKING_SOURCE_LABELS[booking.booking_source] ?? booking.booking_source}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Rooms</p>
              <p className="font-medium text-gray-900">{rooms.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Rooms</p>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.unit_id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm text-gray-900">{room.accommodation_units?.name ?? room.room_config?.unit_name ?? 'Room'}</p>
                    {room.room_config && (
                      <p className="text-xs text-gray-500">
                        {room.room_config.adults}A / {room.room_config.children}C
                      </p>
                    )}
                  </div>
                  {room.room_config && (
                    <p className="text-xs text-gray-500 mt-1">
                      {MEAL_PLAN_LABELS[room.room_config.meal_plan]}
                      {room.room_config.notes ? ` · ${room.room_config.notes}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {(booking.booking_activities ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activities</p>
              <div className="space-y-2">
                {(booking.booking_activities ?? []).map((act) => {
                  const lineTotal = calculateActivityLineTotal(act)
                  const fmt = act.currency_code === 'UGX' ? `UGX ${lineTotal.toLocaleString()}` : `$${lineTotal.toLocaleString()}`
                  return (
                    <div key={act.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">{act.activity_name}</p>
                        <p className="text-xs font-medium text-gray-700">{fmt}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {GUEST_CATEGORY_LABELS[act.guest_category as GuestCategory] ?? act.guest_category}
                        {' · '}{formatDate(act.activity_date)}
                        {' · '}{act.adults}A{act.children > 0 ? ` / ${act.children}C` : ''}
                      </p>
                      {act.notes && <p className="text-xs text-gray-400 mt-0.5">{act.notes}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {booking.special_notes && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Special Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{booking.special_notes}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
