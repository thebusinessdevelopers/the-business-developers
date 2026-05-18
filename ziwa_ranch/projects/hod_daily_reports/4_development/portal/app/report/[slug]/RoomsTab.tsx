'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AccommodationCalendar } from '@hod/shared/components/AccommodationCalendar'
import {
  BUILDING_LABELS,
  MEAL_PLAN_LABELS,
  addAccommodationDays,
  canDirectlyManageAccommodationBookings,
  getAccommodationCapabilities,
  getAccommodationRangePolicy,
  getDefaultAccommodationVisibleRange,
  type AccommodationVisibleRange,
} from '@hod/shared/config/accommodation'
import { getKampalaDateStr } from '@hod/shared/lib/submission-status'
import { addSessionFlushListener } from '@hod/shared/lib/session-flush'
import type { AccommodationUnit, BookingWithUnits, BuildingType, MealPlan, RequestedChanges } from '@hod/shared/types'
import {
  clearSessionStateLocal,
  loadSessionStateLocal,
  saveSessionStateLocal,
} from '@/lib/local-storage'
import BookingManagerModal from './BookingManagerModal'
import BookingDetailsModal from './BookingDetailsModal'

interface PortalUnit {
  id: string
  name: string
  building: string
  category: string
  capacity: number
  pax_config: AccommodationUnit['pax_config']
  rate_category: string
  pricing_type?: 'flat' | 'per_person'
  sort_order: number
}

interface ChangeFormState {
  bookingId: string
  guestName: string
  check_in: string
  check_out: string
  adults: number
  children: number
  meal_plan: string
  special_notes: string
  reason: string
}

interface NewBookingRoom {
  unit_id: string
  unit_name: string
  rate_category: string
  adults: number
  children: number
  meal_plan: MealPlan
}

interface NewBookingFormState {
  guest_name: string
  check_in: string
  check_out: string
  rooms: NewBookingRoom[]
  special_notes: string
}

interface Props {
  departmentSlug: string
  currentUserId: string | null
}

function getDraftScope(currentUserId: string | null): string {
  return currentUserId ?? 'guest'
}

function getNewBookingDraftKey(
  departmentSlug: string,
  currentUserId: string | null
): string {
  return `rooms:new-booking:${departmentSlug}:${getDraftScope(currentUserId)}`
}

function getChangeRequestDraftKey(
  departmentSlug: string,
  currentUserId: string | null,
  bookingId: string
): string {
  return `rooms:change-request:${departmentSlug}:${getDraftScope(currentUserId)}:${bookingId}`
}

function buildNewBookingState(
  defaults: { unit_id?: string; date?: string } | undefined,
  units: PortalUnit[]
): NewBookingFormState {
  const checkIn = defaults?.date || ''
  const checkOut = checkIn ? addAccommodationDays(checkIn, 1) : ''
  const unit = defaults?.unit_id ? units.find((item) => item.id === defaults.unit_id) : null
  const rooms = unit ? [{
    unit_id: unit.id,
    unit_name: unit.name,
    rate_category: unit.rate_category || unit.category,
    adults: 1,
    children: 0,
    meal_plan: 'fb' as MealPlan,
  }] : []

  return {
    guest_name: '',
    check_in: checkIn,
    check_out: checkOut,
    rooms,
    special_notes: '',
  }
}

function buildChangeFormState(booking: BookingWithUnits): ChangeFormState {
  return {
    bookingId: booking.id,
    guestName: booking.guest_name,
    check_in: booking.check_in,
    check_out: booking.check_out,
    adults: booking.adults,
    children: booking.children,
    meal_plan: booking.meal_plan,
    special_notes: '',
    reason: '',
  }
}

function shouldRestoreStoredState(
  storedUpdatedAt: string | undefined,
  serverUpdatedAt: string | null | undefined
): boolean {
  if (!storedUpdatedAt || !serverUpdatedAt) return true

  const storedMs = Date.parse(storedUpdatedAt)
  const serverMs = Date.parse(serverUpdatedAt)
  if (!Number.isFinite(storedMs) || !Number.isFinite(serverMs)) return true

  return storedMs > serverMs
}

export default function RoomsTab({ departmentSlug, currentUserId }: Props) {
  const [bookings, setBookings] = useState<BookingWithUnits[]>([])
  const [units, setUnits] = useState<PortalUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [changeForm, setChangeForm] = useState<ChangeFormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const capabilities = useMemo(() => getAccommodationCapabilities(departmentSlug), [departmentSlug])
  const rangePolicy = useMemo(() => getAccommodationRangePolicy(departmentSlug), [departmentSlug])
  const initialVisibleRange = useMemo(() => getDefaultAccommodationVisibleRange(departmentSlug), [departmentSlug])

  const canBook = capabilities.canCreateBooking
  const needsApproval = capabilities.requiresApproval
  const canDirectlyManageBookings = canDirectlyManageAccommodationBookings(departmentSlug)
  const usesBookingRequestPath = canBook && needsApproval
  const existingBookingAction = capabilities.existingBookingAction
  const emptyCellAction = capabilities.emptyCellAction

  const [showNewBooking, setShowNewBooking] = useState(false)
  const [newBooking, setNewBooking] = useState<NewBookingFormState>({ guest_name: '', check_in: '', check_out: '', rooms: [], special_notes: '' })
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [visibleRange, setVisibleRange] = useState<AccommodationVisibleRange>(initialVisibleRange)
  const [showManagerForm, setShowManagerForm] = useState(false)
  const [managerBookingId, setManagerBookingId] = useState<string | null>(null)
  const [managerDefaults, setManagerDefaults] = useState<{ unit_id?: string; date?: string }>({})
  const [detailsBooking, setDetailsBooking] = useState<BookingWithUnits | null>(null)
  const newBookingRef = useRef(newBooking)
  const changeFormRef = useRef(changeForm)

  useEffect(() => {
    setVisibleRange(initialVisibleRange)
  }, [initialVisibleRange])

  useEffect(() => {
    newBookingRef.current = newBooking
  }, [newBooking])

  useEffect(() => {
    changeFormRef.current = changeForm
  }, [changeForm])

  useEffect(() => {
    if (!actionBanner) return

    const timeoutId = window.setTimeout(() => setActionBanner(null), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [actionBanner])

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accommodation?from=${visibleRange.from}&to=${visibleRange.to}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load accommodation data.')
      }
      setBookings(data.bookings ?? [])
      setUnits(data.units ?? [])
      setLoadError(null)
    } catch (err: unknown) {
      setLoadError((err as Error).message || 'Failed to load accommodation data.')
    }
    setLoading(false)
  }, [visibleRange.from, visibleRange.to])

  useEffect(() => { fetchData() }, [fetchData])

  const todayStr = getKampalaDateStr(new Date())
  const todayBookings = useMemo(
    () => bookings.filter((b) => b.check_in <= todayStr && b.check_out > todayStr),
    [bookings, todayStr],
  )
  const totalGuests = todayBookings.reduce((sum, b) => sum + b.adults + b.children, 0)
  const occupiedToday = useMemo(() => {
    const set = new Set<string>()
    for (const b of todayBookings) {
      for (const br of b.booking_rooms ?? []) set.add(br.unit_id)
    }
    return set
  }, [todayBookings])

  const calendarUnits: AccommodationUnit[] = useMemo(
    () => units.map(u => ({
      ...u,
      building: u.building as BuildingType,
      status: 'active' as const,
      rate_category: u.rate_category || u.category,
      pax_config: u.pax_config,
      description: null,
      pricing_type: u.pricing_type ?? 'flat',
      created_at: '',
    })),
    [units],
  )

  const setSuccessBanner = useCallback((message: string) => {
    setActionBanner({ type: 'success', message })
  }, [])

  const setErrorBanner = useCallback((message: string) => {
    setActionBanner({ type: 'error', message })
  }, [])

  useEffect(() => {
    const persistDrafts = () => {
      if (showNewBooking) {
        saveSessionStateLocal(
          getNewBookingDraftKey(departmentSlug, currentUserId),
          newBookingRef.current
        )
      }

      if (changeFormRef.current) {
        saveSessionStateLocal(
          getChangeRequestDraftKey(
            departmentSlug,
            currentUserId,
            changeFormRef.current.bookingId
          ),
          changeFormRef.current
        )
      }
    }

    const removeFlushListener = addSessionFlushListener(persistDrafts)
    window.addEventListener('pagehide', persistDrafts)
    window.addEventListener('beforeunload', persistDrafts)
    return () => {
      removeFlushListener()
      window.removeEventListener('pagehide', persistDrafts)
      window.removeEventListener('beforeunload', persistDrafts)
    }
  }, [currentUserId, departmentSlug, showNewBooking])

  useEffect(() => {
    if (!showNewBooking) return
    const timeoutId = window.setTimeout(() => {
      saveSessionStateLocal(
        getNewBookingDraftKey(departmentSlug, currentUserId),
        newBooking
      )
    }, 250)
    return () => window.clearTimeout(timeoutId)
  }, [currentUserId, departmentSlug, newBooking, showNewBooking])

  useEffect(() => {
    if (!changeForm) return
    const timeoutId = window.setTimeout(() => {
      saveSessionStateLocal(
        getChangeRequestDraftKey(departmentSlug, currentUserId, changeForm.bookingId),
        changeForm
      )
    }, 250)
    return () => window.clearTimeout(timeoutId)
  }, [changeForm, currentUserId, departmentSlug])

  function openChangeForm(bookingId: string) {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return
    const draftKey = getChangeRequestDraftKey(departmentSlug, currentUserId, booking.id)
    const storedDraft = loadSessionStateLocal<ChangeFormState>(draftKey)
    const shouldRestore = Boolean(
      storedDraft?.data &&
      shouldRestoreStoredState(storedDraft.updatedAt, booking.updated_at)
    )

    if (storedDraft?.data && !shouldRestore) {
      clearSessionStateLocal(draftKey)
    }

    setChangeForm(shouldRestore && storedDraft ? storedDraft.data : buildChangeFormState(booking))
    setSubmitResult(null)
    if (shouldRestore) setSuccessBanner('Unsaved change request draft restored.')
  }

  function openSimpleNewBooking(defaults?: { unit_id?: string; date?: string }) {
    const draftKey = getNewBookingDraftKey(departmentSlug, currentUserId)
    const stored = defaults?.unit_id ? null : loadSessionStateLocal<NewBookingFormState>(draftKey)?.data
    setNewBooking(stored ?? buildNewBookingState(defaults, units))
    setBookingResult(null)
    setShowNewBooking(true)
    if (stored) setSuccessBanner('Unsaved booking draft restored.')
  }

  function openManagerCreate(defaults?: { unit_id?: string; date?: string }) {
    setManagerBookingId(null)
    setManagerDefaults(defaults ?? {})
    setShowManagerForm(true)
  }

  function openManagerEdit(bookingId: string) {
    setManagerDefaults({})
    setManagerBookingId(bookingId)
    setShowManagerForm(true)
  }

  function openExistingBooking(bookingId: string) {
    if (existingBookingAction === 'change_request') {
      openChangeForm(bookingId)
      return
    }

    if (existingBookingAction === 'manage' && canDirectlyManageBookings) {
      openManagerEdit(bookingId)
      return
    }

    if (existingBookingAction === 'manage' && usesBookingRequestPath) {
      openChangeForm(bookingId)
      return
    }

    if (existingBookingAction === 'view') {
      const booking = bookings.find((item) => item.id === bookingId)
      if (booking) setDetailsBooking(booking)
    }
  }

  function openCalendarCreate(defaults?: { unit_id?: string; date?: string }) {
    if (!canBook || emptyCellAction !== 'create') return

    if (existingBookingAction === 'manage') {
      openManagerCreate(defaults)
      return
    }

    openSimpleNewBooking(defaults)
  }

  async function handleMutationSuccess(message: string) {
    await fetchData()
    setSuccessBanner(message)
  }

  async function submitChangeRequest() {
    if (!changeForm || !changeForm.reason.trim()) return
    setSubmitting(true)

    const original = bookings.find((b) => b.id === changeForm.bookingId)
    const changes: RequestedChanges = {}
    if (original) {
      if (changeForm.check_in !== original.check_in) changes.check_in = changeForm.check_in
      if (changeForm.check_out !== original.check_out) changes.check_out = changeForm.check_out
      if (changeForm.adults !== original.adults) changes.adults = changeForm.adults
      if (changeForm.children !== original.children) changes.children = changeForm.children
      if (changeForm.meal_plan !== original.meal_plan) changes.meal_plan = changeForm.meal_plan as MealPlan
      if (changeForm.special_notes.trim()) changes.special_notes = changeForm.special_notes.trim()
    }

    try {
      const res = await fetch('/api/accommodation/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: changeForm.bookingId,
          reason: changeForm.reason.trim(),
          requested_changes: Object.keys(changes).length > 0 ? changes : null,
        }),
      })
      const data = await res.json()
      setSubmitResult(res.ok ? 'success' : 'error')
      if (res.ok) {
        clearSessionStateLocal(
          getChangeRequestDraftKey(departmentSlug, currentUserId, changeForm.bookingId)
        )
        await handleMutationSuccess('Change request submitted.')
        setTimeout(() => { setChangeForm(null); setSubmitResult(null) }, 1200)
      } else {
        setErrorBanner(data.error || 'Failed to submit change request.')
      }
    } catch {
      setSubmitResult('error')
      setErrorBanner('Failed to submit change request.')
    }
    setSubmitting(false)
  }

  const unitsByBuilding = useMemo(() => {
    const map = new Map<string, PortalUnit[]>()
    for (const u of units) {
      const list = map.get(u.building) || []
      list.push(u)
      map.set(u.building, list)
    }
    return map
  }, [units])

  const selectedUnitIds = useMemo(() => new Set(newBooking.rooms.map(r => r.unit_id)), [newBooking.rooms])

  function addBookingRoom(unit: PortalUnit) {
    if (selectedUnitIds.has(unit.id)) return
    setNewBooking(prev => ({
      ...prev,
      rooms: [...prev.rooms, { unit_id: unit.id, unit_name: unit.name, rate_category: unit.rate_category || unit.category, adults: 1, children: 0, meal_plan: 'fb' as MealPlan }],
    }))
    setShowRoomPicker(false)
  }

  function updateBookingRoom(index: number, patch: Partial<NewBookingRoom>) {
    setNewBooking(prev => {
      const rooms = [...prev.rooms]
      rooms[index] = { ...rooms[index], ...patch }
      return { ...prev, rooms }
    })
  }

  function removeBookingRoom(index: number) {
    setNewBooking(prev => ({ ...prev, rooms: prev.rooms.filter((_, i) => i !== index) }))
  }

  async function submitNewBooking() {
    if (!newBooking.guest_name.trim() || !newBooking.check_in || !newBooking.check_out || newBooking.rooms.length === 0) return
    setBookingSubmitting(true)
    setBookingResult(null)

    const basket = newBooking.rooms.map(r => ({
      unit_id: r.unit_id,
      unit_name: r.unit_name,
      rate_category: r.rate_category,
      adults: r.adults,
      children: r.children,
      meal_plan: r.meal_plan,
      rate_per_night: null,
      notes: '',
    }))

    try {
      const res = await fetch('/api/accommodation/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: newBooking.guest_name.trim(),
          check_in: newBooking.check_in,
          check_out: newBooking.check_out,
          basket,
          special_notes: newBooking.special_notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBookingResult({ type: 'error', message: data.error || 'Failed to create booking.' })
      } else {
        const msg = data.status === 'hod_pending'
          ? 'Booking submitted — awaiting admin approval.'
          : 'Booking confirmed.'
        clearSessionStateLocal(getNewBookingDraftKey(departmentSlug, currentUserId))
        await handleMutationSuccess(msg)
        setShowNewBooking(false)
        setBookingResult(null)
      }
    } catch {
      setBookingResult({ type: 'error', message: 'Connection failed. Please try again.' })
    }
    setBookingSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {/* New Booking button */}
      {canBook && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {needsApproval ? 'Bookings require admin approval.' : 'Bookings confirmed immediately.'}
          </p>
          <button
            onClick={() => existingBookingAction === 'manage' ? openManagerCreate() : openSimpleNewBooking()}
            className="bg-ziwa-500 hover:bg-ziwa-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            + New Booking
          </button>
        </div>
      )}

      {actionBanner && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionBanner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {actionBanner.message}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{totalGuests}</p>
          <p className="text-xs text-gray-500">Guests Today</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{occupiedToday.size}/{units.length}</p>
          <p className="text-xs text-gray-500">Rooms Occupied</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="relative left-1/2 w-screen max-w-[1200px] -translate-x-1/2 px-4 sm:px-6">
        <AccommodationCalendar
          key={departmentSlug}
          units={calendarUnits}
          bookings={bookings}
          loading={loading}
          onNewBooking={openCalendarCreate}
          onEditBooking={openExistingBooking}
          allowEmptyCellClick={emptyCellAction === 'create'}
          allowExistingBookingClick={existingBookingAction !== 'none'}
          rangePolicy={rangePolicy}
          initialViewMode={initialVisibleRange.viewMode}
          initialStartDate={initialVisibleRange.startDate}
          onVisibleRangeChange={handleVisibleRangeChange}
        />
      </div>

      {/* New booking form */}
      {showNewBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full my-8 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">New Booking</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name *</label>
              <input
                type="text"
                value={newBooking.guest_name}
                onChange={e => setNewBooking(prev => ({ ...prev, guest_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check In *</label>
                <input
                  type="date"
                  value={newBooking.check_in}
                  onChange={e => setNewBooking(prev => ({ ...prev, check_in: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check Out *</label>
                <input
                  type="date"
                  value={newBooking.check_out}
                  onChange={e => setNewBooking(prev => ({ ...prev, check_out: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
            </div>

            {/* Room list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Rooms <span className="text-gray-400 font-normal">({newBooking.rooms.length})</span>
                </label>
                <button type="button" onClick={() => setShowRoomPicker(true)} className="text-xs font-medium text-ziwa-600 hover:text-ziwa-700">
                  + Add Room
                </button>
              </div>

              {newBooking.rooms.length === 0 && (
                <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">No rooms added.</p>
                  <button type="button" onClick={() => setShowRoomPicker(true)} className="text-xs text-ziwa-600 hover:text-ziwa-700 mt-1">Add a room</button>
                </div>
              )}

              <div className="space-y-2">
                {newBooking.rooms.map((room, i) => (
                  <div key={room.unit_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{room.unit_name}</span>
                      <button type="button" onClick={() => removeBookingRoom(i)} className="text-gray-400 hover:text-red-500 text-sm">&times;</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Adults</label>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateBookingRoom(i, { adults: Math.max(1, room.adults - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                          <span className="text-sm w-5 text-center">{room.adults}</span>
                          <button type="button" onClick={() => updateBookingRoom(i, { adults: room.adults + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Children</label>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateBookingRoom(i, { children: Math.max(0, room.children - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                          <span className="text-sm w-5 text-center">{room.children}</span>
                          <button type="button" onClick={() => updateBookingRoom(i, { children: room.children + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Meal Plan</label>
                        <select value={room.meal_plan} onChange={e => updateBookingRoom(i, { meal_plan: e.target.value as MealPlan })}
                          className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                          {Object.entries(MEAL_PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Special Notes</label>
              <textarea
                value={newBooking.special_notes}
                onChange={e => setNewBooking(prev => ({ ...prev, special_notes: e.target.value }))}
                rows={2}
                placeholder="Any special requirements"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            {bookingResult && (
              <p className={`text-sm ${bookingResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {bookingResult.message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={submitNewBooking}
                disabled={bookingSubmitting || !newBooking.guest_name.trim() || !newBooking.check_in || !newBooking.check_out || newBooking.rooms.length === 0}
                className="bg-ziwa-500 hover:bg-ziwa-600 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {bookingSubmitting ? 'Submitting…' : needsApproval ? 'Submit for Approval' : 'Create Booking'}
              </button>
              <button
                onClick={() => {
                  clearSessionStateLocal(getNewBookingDraftKey(departmentSlug, currentUserId))
                  setShowNewBooking(false)
                  setBookingResult(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room picker for new booking */}
      {showRoomPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowRoomPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Select Room</h3>
              <button onClick={() => setShowRoomPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-3 space-y-3">
              {Array.from(unitsByBuilding.entries()).map(([building, bUnits]) => (
                <div key={building}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{BUILDING_LABELS[building as keyof typeof BUILDING_LABELS] ?? building}</p>
                  <div className="flex flex-wrap gap-1">
                    {bUnits.map(u => {
                      const added = selectedUnitIds.has(u.id)
                      return (
                        <button key={u.id} type="button" disabled={added}
                          onClick={() => addBookingRoom(u)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            added
                              ? 'bg-ziwa-100 border-ziwa-400 text-ziwa-700 font-medium opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-ziwa-300 hover:text-ziwa-700'
                          }`}>
                          {u.name} <span className="text-gray-400">({u.capacity})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showManagerForm && (
        <BookingManagerModal
          departmentSlug={departmentSlug}
          currentUserId={currentUserId}
          units={calendarUnits}
          bookingId={managerBookingId}
          defaults={managerDefaults}
          onClose={() => {
            setShowManagerForm(false)
            setManagerBookingId(null)
            setManagerDefaults({})
          }}
          onSaved={handleMutationSuccess}
        />
      )}

      {detailsBooking && (
        <BookingDetailsModal
          booking={detailsBooking}
          onClose={() => setDetailsBooking(null)}
        />
      )}

      {/* Structured change request form */}
      {changeForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full my-8 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Request Change</h3>
            <p className="text-sm text-gray-600">
              Booking: <span className="font-medium">{changeForm.guestName}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check In</label>
                <input
                  type="date"
                  value={changeForm.check_in}
                  onChange={(e) => setChangeForm((f) => f ? { ...f, check_in: e.target.value } : f)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check Out</label>
                <input
                  type="date"
                  value={changeForm.check_out}
                  onChange={(e) => setChangeForm((f) => f ? { ...f, check_out: e.target.value } : f)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Adults</label>
                <input
                  type="number"
                  min={1}
                  value={changeForm.adults}
                  onChange={(e) => setChangeForm((f) => f ? { ...f, adults: Number(e.target.value) } : f)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Children</label>
                <input
                  type="number"
                  min={0}
                  value={changeForm.children}
                  onChange={(e) => setChangeForm((f) => f ? { ...f, children: Number(e.target.value) } : f)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Meal Plan</label>
                <select
                  value={changeForm.meal_plan}
                  onChange={(e) => setChangeForm((f) => f ? { ...f, meal_plan: e.target.value } : f)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                >
                  {Object.entries(MEAL_PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
              <input
                type="text"
                value={changeForm.special_notes}
                onChange={(e) => setChangeForm((f) => f ? { ...f, special_notes: e.target.value } : f)}
                placeholder="e.g. guest requests early check-in"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason for change *</label>
              <textarea
                value={changeForm.reason}
                onChange={(e) => setChangeForm((f) => f ? { ...f, reason: e.target.value } : f)}
                placeholder="Why is this change needed?"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            {submitResult === 'success' && <p className="text-sm text-green-600">Request submitted.</p>}
            {submitResult === 'error' && <p className="text-sm text-red-600">Failed to submit. Try again.</p>}

            <div className="flex gap-3">
              <button
                onClick={submitChangeRequest}
                disabled={submitting || !changeForm.reason.trim()}
                className="bg-ziwa-500 hover:bg-ziwa-600 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button
                onClick={() => {
                  clearSessionStateLocal(
                    getChangeRequestDraftKey(
                      departmentSlug,
                      currentUserId,
                      changeForm.bookingId
                    )
                  )
                  setChangeForm(null)
                  setSubmitResult(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
