'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AccommodationRate,
  AccommodationUnit,
  ActivityBasketItem,
  BookingChangeRequest,
  BookingPayment,
  BookingSource,
  BookingStatus,
  GuestCategory,
  MealPlan,
  PaymentStatus,
  RateType,
  RoomBasketItem,
} from '@hod/shared/types'
import {
  ACTIVITY_NAMES,
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_LABELS,
  BUILDING_LABELS,
  GUEST_CATEGORY_LABELS,
  MEAL_PLAN_LABELS,
  PAYMENT_STATUS_LABELS,
  RATE_TYPE_LABELS,
  addAccommodationDays,
  buildDefaultActivity,
  calculateActivitiesSubtotals,
  calculateActivityLineTotal,
  calculateBasketRate,
  calculateItemRate,
  formatDate,
  lookupActivityRate,
  nightsBetween,
} from '@hod/shared/config/accommodation'
import { addSessionFlushListener } from '@hod/shared/lib/session-flush'
import {
  clearSessionStateLocal,
  loadSessionStateLocal,
  saveSessionStateLocal,
} from '@/lib/local-storage'

interface Props {
  departmentSlug: string
  currentUserId: string | null
  units: AccommodationUnit[]
  bookingId: string | null
  defaults: { unit_id?: string; date?: string }
  onClose: () => void
  onSaved: (message: string) => Promise<void> | void
}

interface FormState {
  guest_name: string
  guest_email: string
  guest_phone: string
  is_private: boolean
  company_name: string
  check_in: string
  check_out: string
  basket: RoomBasketItem[]
  activities: ActivityBasketItem[]
  rate_type: RateType
  booking_source: BookingSource
  agent_name: string
  special_notes: string
  payment_status: PaymentStatus
  status: BookingStatus
}

interface LoadedBookingRecord {
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  is_private?: boolean | null
  company_name?: string | null
  check_in?: string | null
  check_out?: string | null
  booking_source?: BookingSource | null
  agent_name?: string | null
  special_notes?: string | null
  payment_status?: PaymentStatus | null
  rate_type?: RateType | null
  status?: BookingStatus | null
  updated_at?: string | null
  meal_plan?: MealPlan | null
  booking_rooms?: Array<{ unit_id: string; room_config?: RoomBasketItem | null }>
  booking_activities?: Array<Record<string, unknown>>
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function buildInitial(defaults: Props['defaults']): FormState {
  const checkIn = defaults.date || ''
  const checkOut = checkIn ? addAccommodationDays(checkIn, 1) : ''
  return {
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    is_private: true,
    company_name: '',
    check_in: checkIn,
    check_out: checkOut,
    basket: [],
    activities: [],
    rate_type: 'rack',
    booking_source: 'direct',
    agent_name: '',
    special_notes: '',
    payment_status: 'unpaid',
    status: 'confirmed',
  }
}

function getManagerDraftKey(
  departmentSlug: string,
  currentUserId: string | null,
  bookingId: string | null
): string {
  return `rooms:manager:${departmentSlug}:${currentUserId ?? 'guest'}:${bookingId ?? 'new'}`
}

function hasManagerDraft(form: FormState): boolean {
  return Boolean(
    form.guest_name.trim() ||
    form.company_name.trim() ||
    form.check_in ||
    form.check_out ||
    form.basket.length > 0 ||
    form.agent_name.trim() ||
    form.special_notes.trim()
  )
}

function shouldRestoreStoredDraft(
  storedUpdatedAt: string | undefined,
  serverUpdatedAt: string | null | undefined
): boolean {
  if (!storedUpdatedAt || !serverUpdatedAt) return true

  const storedMs = Date.parse(storedUpdatedAt)
  const serverMs = Date.parse(serverUpdatedAt)
  if (!Number.isFinite(storedMs) || !Number.isFinite(serverMs)) return true

  return storedMs > serverMs
}

export default function BookingManagerModal({
  departmentSlug,
  currentUserId,
  units,
  bookingId,
  defaults,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(() => buildInitial(defaults))
  const [rates, setRates] = useState<AccommodationRate[]>([])
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [loadingBooking, setLoadingBooking] = useState(!!bookingId)
  const [loadingRates, setLoadingRates] = useState(true)
  const [error, setError] = useState('')
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [restoredDraft, setRestoredDraft] = useState(false)
  const formRef = useRef(form)
  const draftKey = useMemo(
    () => getManagerDraftKey(departmentSlug, currentUserId, bookingId),
    [departmentSlug, currentUserId, bookingId]
  )

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    if (!restoredDraft) return
    const timeoutId = window.setTimeout(() => setRestoredDraft(false), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [restoredDraft])

  useEffect(() => {
    if (bookingId || defaults.unit_id) return
    const storedDraft = loadSessionStateLocal<FormState>(draftKey)
    if (!storedDraft?.data) return
    setForm(storedDraft.data)
    setRestoredDraft(true)
  }, [bookingId, defaults.unit_id, draftKey])

  const persistDraft = useCallback(() => {
    if (!hasManagerDraft(formRef.current)) {
      clearSessionStateLocal(draftKey)
      return
    }
    saveSessionStateLocal(draftKey, formRef.current)
  }, [draftKey])

  useEffect(() => {
    return addSessionFlushListener(persistDraft)
  }, [persistDraft])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => persistDraft(), 250)
    return () => window.clearTimeout(timeoutId)
  }, [form, persistDraft])

  useEffect(() => {
    window.addEventListener('pagehide', persistDraft)
    window.addEventListener('beforeunload', persistDraft)
    return () => {
      window.removeEventListener('pagehide', persistDraft)
      window.removeEventListener('beforeunload', persistDraft)
    }
  }, [persistDraft])

  const handleClose = useCallback(() => {
    clearSessionStateLocal(draftKey)
    onClose()
  }, [draftKey, onClose])

  useEffect(() => {
    let cancelled = false

    fetch('/api/accommodation/rates')
      .then(async (response) => {
        const data = await readJsonResponse(response)
        if (!response.ok) throw new Error(String(data?.error || 'Failed to load accommodation rates.'))
        return data
      })
      .then((data) => {
        if (cancelled) return
        setRates(Array.isArray(data) ? data : [])
        setLoadingRates(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError((err as Error).message || 'Failed to load accommodation rates.')
        setLoadingRates(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!bookingId) return

    setLoadingBooking(true)
    fetch(`/api/accommodation/bookings/${bookingId}`)
      .then(async (response) => {
        const data = await readJsonResponse(response)
        if (!response.ok) throw new Error(String(data?.error || 'Failed to load booking.'))
        if (!data) throw new Error('Failed to load booking.')
        return data as unknown as LoadedBookingRecord
      })
      .then((booking) => {
        const rooms: { unit_id: string; room_config?: RoomBasketItem | null }[] = booking.booking_rooms ?? []
        const basket = rooms.map((room) => {
          const unit = units.find((item) => item.id === room.unit_id)
          if (room.room_config) {
            return {
              ...room.room_config,
              pricing_type: room.room_config.pricing_type ?? unit?.pricing_type ?? 'flat',
              isComplimentary: room.room_config.isComplimentary ?? false,
              compReason: room.room_config.compReason,
            }
          }
          return {
            unit_id: room.unit_id,
            unit_name: unit?.name ?? 'Unknown',
            rate_category: unit?.rate_category ?? '',
            adults: 1,
            children: 0,
            meal_plan: booking.meal_plan || 'fb',
            rate_per_night: null,
            notes: '',
            pricing_type: unit?.pricing_type ?? 'flat',
            isComplimentary: false,
          }
        })

        const loadedActivities: ActivityBasketItem[] = (booking.booking_activities ?? []).map((a: Record<string, unknown>) => ({
          activity_name: a.activity_name as string,
          guest_category: a.guest_category as GuestCategory,
          activity_date: a.activity_date as string,
          adults: (a.adults as number) || 0,
          children: (a.children as number) || 0,
          adult_rate: Number(a.adult_rate) || 0,
          child_rate: Number(a.child_rate) || 0,
          currency_code: (a.currency_code as 'USD' | 'UGX') || 'USD',
          notes: (a.notes as string) || '',
        }))

        const loadedForm: FormState = {
          guest_name: booking.guest_name || '',
          guest_email: booking.guest_email || '',
          guest_phone: booking.guest_phone || '',
          is_private: booking.is_private ?? true,
          company_name: booking.company_name || '',
          check_in: booking.check_in || '',
          check_out: booking.check_out || '',
          basket,
          activities: loadedActivities,
          rate_type: booking.rate_type || 'rack',
          booking_source: booking.booking_source || 'direct',
          agent_name: booking.agent_name || '',
          special_notes: booking.special_notes || '',
          payment_status: booking.payment_status || 'unpaid',
          status: booking.status || 'confirmed',
        }
        const storedDraft = loadSessionStateLocal<FormState>(draftKey)
        const shouldRestore = Boolean(
          storedDraft?.data &&
          shouldRestoreStoredDraft(storedDraft.updatedAt, booking.updated_at)
        )

        if (storedDraft?.data && !shouldRestore) {
          clearSessionStateLocal(draftKey)
        }

        setForm(shouldRestore && storedDraft ? storedDraft.data : loadedForm)
        setRestoredDraft(shouldRestore)
        setLoadingBooking(false)
      })
      .catch(() => {
        setError('Failed to load booking.')
        setLoadingBooking(false)
      })
  }, [bookingId, draftKey, units])

  useEffect(() => {
    if (bookingId || !defaults.unit_id || restoredDraft) return

    const unit = units.find((item) => item.id === defaults.unit_id)
    if (!unit) return

    setForm((current) => {
      if (current.basket.some((item) => item.unit_id === unit.id)) return current

      const newItem: RoomBasketItem = {
        unit_id: unit.id,
        unit_name: unit.name,
        rate_category: unit.rate_category,
        adults: 1,
        children: 0,
        meal_plan: 'fb',
        rate_per_night: null,
        notes: '',
        pricing_type: unit.pricing_type ?? 'flat',
        isComplimentary: false,
      }
      const year = current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear()
      const suggestedRate = calculateItemRate(newItem, rates, current.rate_type, year)
      if (suggestedRate != null) newItem.rate_per_night = suggestedRate

      return { ...current, basket: [...current.basket, newItem] }
    })
  }, [bookingId, defaults.unit_id, rates, restoredDraft, units])

  useEffect(() => {
    if (loadingRates || rates.length === 0) return
    setForm((current) => {
      const hasNullRate = current.basket.some((item) => item.rate_per_night == null)
      if (!hasNullRate) return current
      const yr = current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear()
      const basket = current.basket.map((item) => {
        if (item.rate_per_night != null) return item
        const suggested = calculateItemRate({ ...item, rate_per_night: null }, rates, current.rate_type, yr)
        return { ...item, rate_per_night: suggested }
      })
      return { ...current, basket }
    })
  }, [loadingRates, rates])

  const nights = form.check_in && form.check_out ? nightsBetween(form.check_in, form.check_out) : 0
  const year = form.check_in ? new Date(form.check_in).getFullYear() : new Date().getFullYear()
  const isPendingReview = bookingId != null && form.status === 'hod_pending'

  const rateBreakdown = useMemo(
    () => calculateBasketRate(form.basket, rates, form.rate_type, form.check_in, form.check_out),
    [form.basket, form.check_in, form.check_out, form.rate_type, rates],
  )

  const unitsByBuilding = useMemo(() => {
    const map = new Map<string, AccommodationUnit[]>()
    for (const unit of units) {
      if (unit.status !== 'active') continue
      const list = map.get(unit.building) || []
      list.push(unit)
      map.set(unit.building, list)
    }
    return map
  }, [units])

  const selectedUnitIds = useMemo(() => new Set(form.basket.map((item) => item.unit_id)), [form.basket])

  const statusOptions = useMemo(
    () => Object.entries(BOOKING_STATUS_LABELS).filter(([status]) => status !== 'hod_pending' || isPendingReview),
    [isPendingReview],
  )

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const addRoom = useCallback((unit: AccommodationUnit) => {
    if (selectedUnitIds.has(unit.id)) return

    const newItem: RoomBasketItem = {
      unit_id: unit.id,
      unit_name: unit.name,
      rate_category: unit.rate_category,
      adults: 1,
      children: 0,
      meal_plan: 'fb',
      rate_per_night: null,
      notes: '',
      pricing_type: unit.pricing_type ?? 'flat',
      isComplimentary: false,
    }
    const suggestedRate = calculateItemRate(newItem, rates, form.rate_type, year)
    if (suggestedRate != null) newItem.rate_per_night = suggestedRate

    setForm((current) => ({ ...current, basket: [...current.basket, newItem] }))
    setShowRoomPicker(false)
  }, [form.rate_type, rates, selectedUnitIds, year])

  const updateItem = useCallback((index: number, patch: Partial<RoomBasketItem>) => {
    setForm((current) => {
      const basket = [...current.basket]
      const updated = { ...basket[index], ...patch }

      if (('adults' in patch || 'children' in patch || 'meal_plan' in patch) && !('rate_per_night' in patch)) {
        const refreshed: RoomBasketItem = { ...updated, rate_per_night: null }
        const suggested = calculateItemRate(
          refreshed,
          rates,
          current.rate_type,
          current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear(),
        )
        updated.rate_per_night = suggested
      }

      basket[index] = updated
      return { ...current, basket }
    })
  }, [rates])

  const removeItem = useCallback((index: number) => {
    setForm((current) => ({ ...current, basket: current.basket.filter((_, itemIndex) => itemIndex !== index) }))
  }, [])

  const recalcItemRate = useCallback((index: number) => {
    setForm((current) => {
      const basket = [...current.basket]
      const item: RoomBasketItem = { ...basket[index], rate_per_night: null }
      const suggested = calculateItemRate(item, rates, current.rate_type, year)
      item.rate_per_night = suggested
      basket[index] = item
      return { ...current, basket }
    })
  }, [rates, year])

  const [showActivities, setShowActivities] = useState(false)
  const [payments, setPayments] = useState<BookingPayment[]>([])
  const [showPayments, setShowPayments] = useState(false)
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([])
  const [showChangeHistory, setShowChangeHistory] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletionSubmitting, setDeletionSubmitting] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    Promise.all([
      fetch(`/api/accommodation/bookings/${bookingId}/payments`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/accommodation/change-requests?status=all&booking_id=${bookingId}`).then((r) => r.ok ? r.json() : []),
    ]).then(([p, cr]) => {
      if (Array.isArray(p)) setPayments(p)
      if (Array.isArray(cr)) setChangeRequests(cr)
    }).catch(() => {})
  }, [bookingId])

  useEffect(() => {
    if (form.activities.length > 0) setShowActivities(true)
  }, [form.activities.length])

  const activitySubtotals = useMemo(
    () => calculateActivitiesSubtotals(form.activities),
    [form.activities],
  )

  const addActivity = useCallback(() => {
    setForm((current) => ({ ...current, activities: [...current.activities, buildDefaultActivity(current.check_in)] }))
    setShowActivities(true)
  }, [])

  const updateActivity = useCallback((index: number, patch: Partial<ActivityBasketItem>) => {
    setForm((current) => {
      const activities = [...current.activities]
      let updated = { ...activities[index], ...patch }
      if ('activity_name' in patch || 'guest_category' in patch) {
        const rateEntry = lookupActivityRate(updated.activity_name, updated.guest_category)
        if (rateEntry) {
          updated = { ...updated, adult_rate: rateEntry.adult_rate, child_rate: rateEntry.child_rate, currency_code: rateEntry.currency_code }
        }
      }
      activities[index] = updated
      return { ...current, activities }
    })
  }, [])

  const removeActivity = useCallback((index: number) => {
    setForm((current) => ({ ...current, activities: current.activities.filter((_, i) => i !== index) }))
  }, [])

  async function handleDeletionRequest() {
    if (!bookingId || !deletionReason.trim()) return
    setDeletionSubmitting(true)
    try {
      const res = await fetch('/api/accommodation/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          reason: deletionReason.trim(),
          requested_changes: { action: 'delete' },
        }),
      })
      if (res.ok) {
        setShowDeleteConfirm(false)
        setDeletionReason('')
        await onSaved('Deletion request submitted — awaiting admin approval.')
        onClose()
      } else {
        const data = await readJsonResponse(res)
        setError(String(data?.error || 'Failed to submit deletion request.'))
      }
    } catch {
      setError('Failed to submit deletion request.')
    }
    setDeletionSubmitting(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!form.guest_name.trim()) {
      setError('Guest name is required.')
      return
    }
    if (!form.check_in || !form.check_out) {
      setError('Check-in and check-out dates are required.')
      return
    }
    if (form.check_out <= form.check_in) {
      setError('Check-out must be after check-in.')
      return
    }
    if (form.basket.length === 0) {
      setError('Add at least one room.')
      return
    }
    if (!form.is_private && !form.company_name.trim()) {
      setError('Company name is required for company bookings.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        is_private: form.is_private,
        company_name: form.is_private ? null : form.company_name.trim(),
        check_in: form.check_in,
        check_out: form.check_out,
        rate_type: form.rate_type,
        booking_source: form.booking_source,
        agent_name: form.agent_name.trim() || null,
        special_notes: form.special_notes.trim() || null,
        payment_status: form.payment_status,
        status: form.status,
        basket: form.basket,
        activities: form.activities,
        adults: form.basket.reduce((sum, item) => sum + item.adults, 0),
        children: form.basket.reduce((sum, item) => sum + item.children, 0),
        meal_plan: form.basket[0]?.meal_plan ?? 'fb',
        agreed_rate_per_night: rateBreakdown ? rateBreakdown.perNightTotal : null,
        unit_ids: form.basket.map((item) => item.unit_id),
      }

      const url = bookingId ? `/api/accommodation/bookings/${bookingId}` : '/api/accommodation/bookings'
      const method = bookingId ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(String(data?.error || 'Failed to save booking.'))

      const successMessage = bookingId ? 'Booking updated.' : 'Booking created.'
      clearSessionStateLocal(draftKey)
      await onSaved(successMessage)
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setSaving(false)
  }

  async function handleReview(action: 'approved' | 'denied') {
    if (!bookingId) return

    setApproving(true)
    setError('')

    try {
      const response = await fetch('/api/accommodation/bookings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          action,
          denial_reason: action === 'denied' ? denialReason.trim() || undefined : undefined,
        }),
      })
      const data = await readJsonResponse(response)
      if (!response.ok) throw new Error(String(data?.error || 'Review action failed.'))

      clearSessionStateLocal(draftKey)
      await onSaved(action === 'approved' ? 'Pending booking approved.' : 'Pending booking denied.')
      setShowDenyModal(false)
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message)
    }

    setApproving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {bookingId ? 'Manage Booking' : 'New Booking'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Booking management — {departmentSlug}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {(loadingBooking || loadingRates) ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading booking tools…</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {restoredDraft && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Unsaved booking draft restored.
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name *</label>
              <input
                type="text"
                value={form.guest_name}
                onChange={(event) => set('guest_name', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={form.guest_email}
                  onChange={(event) => set('guest_email', event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+256 …"
                  value={form.guest_phone}
                  onChange={(event) => set('guest_phone', event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setForm((current) => {
                    const yr = current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear()
                    const basket = current.basket.map((item) => {
                      const cleared: RoomBasketItem = { ...item, rate_per_night: null }
                      const suggested = calculateItemRate(cleared, rates, 'rack', yr)
                      return { ...cleared, rate_per_night: suggested }
                    })
                    return { ...current, is_private: true, company_name: '', rate_type: 'rack', basket }
                  })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                    form.is_private ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => {
                    const yr = current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear()
                    const basket = current.basket.map((item) => {
                      const cleared: RoomBasketItem = { ...item, rate_per_night: null }
                      const suggested = calculateItemRate(cleared, rates, 'sto', yr)
                      return { ...cleared, rate_per_night: suggested }
                    })
                    return { ...current, is_private: false, rate_type: 'sto', basket }
                  })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                    !form.is_private ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Company
                </button>
              </div>
              {!form.is_private && (
                <input
                  type="text"
                  placeholder="Company name *"
                  value={form.company_name}
                  onChange={(event) => set('company_name', event.target.value)}
                  className="flex-1 min-w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check In *</label>
                <input
                  type="date"
                  value={form.check_in}
                  onChange={(event) => { const v = event.target.value; set('check_in', v); if (v && (!form.check_out || form.check_out <= v)) set('check_out', addAccommodationDays(v, 1)) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check Out *</label>
                <input
                  type="date"
                  value={form.check_out}
                  onChange={(event) => set('check_out', event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
              <div className="flex items-end">
                {nights > 0 && (
                  <span className="text-sm text-gray-500 pb-2">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                <select
                  value={form.booking_source}
                  onChange={(event) => set('booking_source', event.target.value as BookingSource)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                >
                  {Object.entries(BOOKING_SOURCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Booking Status</label>
                <select
                  value={form.status}
                  onChange={(event) => set('status', event.target.value as BookingStatus)}
                  disabled={isPendingReview}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                >
                  {statusOptions.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                <select
                  value={form.payment_status}
                  onChange={(event) => set('payment_status', event.target.value as PaymentStatus)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                >
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.booking_source === 'agent' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={form.agent_name}
                  onChange={(event) => set('agent_name', event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Rooms <span className="text-gray-400 font-normal">({form.basket.length})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowRoomPicker(true)}
                  className="text-xs font-medium text-ziwa-600 hover:text-ziwa-700"
                >
                  + Add Room
                </button>
              </div>

              {form.basket.length === 0 && (
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400">No rooms added yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowRoomPicker(true)}
                    className="text-xs text-ziwa-600 hover:text-ziwa-700 mt-1"
                  >
                    Add a room
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {form.basket.map((item, index) => {
                  const itemRate = item.isComplimentary ? 0 : item.rate_per_night
                  const itemTotal = item.isComplimentary ? 0 : (itemRate != null && nights > 0 ? itemRate * nights : null)

                  return (
                    <div key={item.unit_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {item.unit_name}
                          {item.pricing_type === 'per_person' && (
                            <span className="ml-2 text-[10px] text-ziwa-600 font-normal uppercase tracking-wide">per person</span>
                          )}
                        </span>
                        <button type="button" onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 text-sm">&times;</button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Adults</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(index, { adults: Math.max(1, item.adults - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                            <span className="text-sm w-5 text-center">{item.adults}</span>
                            <button type="button" onClick={() => updateItem(index, { adults: item.adults + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Children</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(index, { children: Math.max(0, item.children - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                            <span className="text-sm w-5 text-center">{item.children}</span>
                            <button type="button" onClick={() => updateItem(index, { children: item.children + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Meal Plan</label>
                          <select
                            value={item.meal_plan}
                            onChange={(event) => updateItem(index, { meal_plan: event.target.value as MealPlan })}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                          >
                            {Object.entries(MEAL_PLAN_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Rate/night ($)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.rate_per_night ?? ''}
                            onChange={(event) => updateItem(index, { rate_per_night: event.target.value ? Number(event.target.value) : null })}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="text"
                          placeholder="Room notes"
                          value={item.notes}
                          onChange={(event) => updateItem(index, { notes: event.target.value })}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                        />
                        <button type="button" onClick={() => recalcItemRate(index)} className="text-[10px] text-gray-400 hover:text-ziwa-600 whitespace-nowrap">
                          auto rate
                        </button>
                        {itemTotal != null && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            ${itemRate} × {nights}n = ${itemTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={item.isComplimentary}
                            onChange={(event) => updateItem(index, { isComplimentary: event.target.checked, compReason: event.target.checked ? (item.compReason ?? '') : undefined })}
                            className="rounded border-gray-300 text-ziwa-500 focus:ring-ziwa-400"
                          />
                          Complimentary
                        </label>
                        {item.isComplimentary && (
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={item.compReason ?? ''}
                            onChange={(event) => updateItem(index, { compReason: event.target.value })}
                            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activities */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setShowActivities(!showActivities)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
                  <span className={`inline-block transition-transform ${showActivities ? 'rotate-90' : ''}`}>▶</span>
                  Activities <span className="text-gray-400 font-normal">({form.activities.length})</span>
                </button>
                <button type="button" onClick={addActivity} className="text-xs font-medium text-ziwa-600 hover:text-ziwa-700">
                  + Add Activity
                </button>
              </div>
              {showActivities && (
                <div className="space-y-3">
                  {form.activities.length === 0 && (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-400">No activities added yet.</p>
                    </div>
                  )}
                  {form.activities.map((act, actIdx) => {
                    const lineTotal = calculateActivityLineTotal(act)
                    return (
                      <div key={actIdx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <select value={act.activity_name} onChange={(e) => updateActivity(actIdx, { activity_name: e.target.value })}
                            className="text-sm font-medium text-gray-800 border-0 bg-transparent p-0 focus:ring-0 cursor-pointer">
                            {ACTIVITY_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                          </select>
                          <button type="button" onClick={() => removeActivity(actIdx)} className="text-gray-400 hover:text-red-500 text-sm">&times;</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Guest Category</label>
                            <select value={act.guest_category} onChange={(e) => updateActivity(actIdx, { guest_category: e.target.value as GuestCategory })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                              {(Object.entries(GUEST_CATEGORY_LABELS) as [GuestCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Date</label>
                            <input type="date" value={act.activity_date} onChange={(e) => updateActivity(actIdx, { activity_date: e.target.value })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Adults</label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateActivity(actIdx, { adults: Math.max(0, act.adults - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                              <span className="text-sm w-5 text-center">{act.adults}</span>
                              <button type="button" onClick={() => updateActivity(actIdx, { adults: act.adults + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Children</label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateActivity(actIdx, { children: Math.max(0, act.children - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                              <span className="text-sm w-5 text-center">{act.children}</span>
                              <button type="button" onClick={() => updateActivity(actIdx, { children: act.children + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{act.currency_code === 'UGX' ? `UGX ${lineTotal.toLocaleString()}` : `$${lineTotal.toLocaleString()}`}</span>
                        </div>
                      </div>
                    )
                  })}
                  {form.activities.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                      {activitySubtotals.usd > 0 && <span>Activities (USD): <span className="font-medium text-gray-800">${activitySubtotals.usd.toLocaleString()}</span></span>}
                      {activitySubtotals.ugx > 0 && <span>Activities (UGX): <span className="font-medium text-gray-800">UGX {activitySubtotals.ugx.toLocaleString()}</span></span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate Type</label>
                <select
                  value={form.rate_type}
                  onChange={(event) => { const newType = event.target.value as RateType; setForm((current) => { const yr = current.check_in ? new Date(current.check_in).getFullYear() : new Date().getFullYear(); const basket = current.basket.map((item) => { const cleared: RoomBasketItem = { ...item, rate_per_night: null }; const suggested = calculateItemRate(cleared, rates, newType, yr); return { ...cleared, rate_per_night: suggested }; }); const is_private = newType === 'sto' ? false : (current.is_private || !current.company_name.trim()); return { ...current, rate_type: newType, basket, is_private } }) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                >
                  {Object.entries(RATE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end pb-2">
                <div className="text-sm space-y-0.5">
                  {rateBreakdown && (
                    <div>
                      <span className="font-semibold text-gray-800">Rooms: ${rateBreakdown.grandTotal.toLocaleString()}</span>
                      <span className="text-gray-400 ml-1.5">
                        (${rateBreakdown.perNightTotal}/night × {rateBreakdown.nights}n)
                      </span>
                    </div>
                  )}
                  {rateBreakdown && activitySubtotals.usd > 0 && (
                    <div className="font-semibold text-gray-800">
                      Grand Total (USD): ${(rateBreakdown.grandTotal + activitySubtotals.usd).toLocaleString()}
                    </div>
                  )}
                  {activitySubtotals.ugx > 0 && (
                    <div className="text-gray-600">
                      + UGX {activitySubtotals.ugx.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Special Notes</label>
              <textarea
                value={form.special_notes}
                onChange={(event) => set('special_notes', event.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
              />
            </div>

            {/* Payments (read-only for HOD) */}
            {bookingId && payments.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowPayments(!showPayments)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 mb-2">
                  <span className={`inline-block transition-transform ${showPayments ? 'rotate-90' : ''}`}>▶</span>
                  Payments <span className="text-gray-400 font-normal">({payments.length})</span>
                </button>
                {showPayments && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Date</th>
                          <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Amount</th>
                          <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-1.5 text-gray-700">{p.payment_date}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                              {p.currency === 'UGX' ? `UGX ${Number(p.amount).toLocaleString()}` : `$${Number(p.amount).toLocaleString()}`}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500">{p.payment_method || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Change-request history */}
            {bookingId && changeRequests.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowChangeHistory(!showChangeHistory)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 mb-2">
                  <span className={`inline-block transition-transform ${showChangeHistory ? 'rotate-90' : ''}`}>▶</span>
                  Change Requests <span className="text-gray-400 font-normal">({changeRequests.length})</span>
                </button>
                {showChangeHistory && (
                  <div className="space-y-2">
                    {changeRequests.map((cr) => (
                      <div key={cr.id} className={`border rounded-lg p-3 text-xs space-y-1 ${
                        cr.status === 'approved' ? 'border-green-200 bg-green-50/50' :
                        cr.status === 'denied' ? 'border-red-200 bg-red-50/50' :
                        'border-amber-200 bg-amber-50/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">
                            {cr.requesting_user?.hod_name ?? 'Unknown'} · {cr.requesting_dept?.name ?? ''}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            cr.status === 'approved' ? 'bg-green-100 text-green-700' :
                            cr.status === 'denied' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{cr.status}</span>
                        </div>
                        <p className="text-gray-600">{cr.reason}</p>
                        {cr.requested_changes && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(cr.requested_changes).map(([key, val]) => (
                              <span key={key} className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{key}: {String(val)}</span>
                            ))}
                          </div>
                        )}
                        <div className="text-gray-400">
                          <span>{formatDate(cr.created_at)}</span>
                          {cr.reviewed_at && <span> · Reviewed {formatDate(cr.reviewed_at)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isPendingReview && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-800 font-medium flex-1">
                  This booking is awaiting review from Head Office.
                </span>
                <button
                  type="button"
                  onClick={() => handleReview('approved')}
                  disabled={approving}
                  className="text-sm font-medium text-green-600 border border-green-300 rounded px-3 py-1.5 hover:bg-green-50 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setShowDenyModal(true)}
                  disabled={approving}
                  className="text-sm font-medium text-red-600 border border-red-300 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Deny
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-ziwa-500 hover:bg-ziwa-600 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors">
                {saving ? 'Saving…' : bookingId ? 'Update Booking' : 'Create Booking'}
              </button>
              <button type="button" onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              {bookingId && (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="ml-auto text-sm text-red-500 hover:text-red-700">
                  Request Deletion
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {showRoomPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowRoomPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Select Room</h3>
              <button onClick={() => setShowRoomPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-3 space-y-3">
              {Array.from(unitsByBuilding.entries()).map(([building, buildingUnits]) => (
                <div key={building}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                    {BUILDING_LABELS[building as keyof typeof BUILDING_LABELS] ?? building}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {buildingUnits.map((unit) => {
                      const alreadyAdded = selectedUnitIds.has(unit.id)
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addRoom(unit)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            alreadyAdded
                              ? 'bg-ziwa-100 border-ziwa-400 text-ziwa-700 font-medium opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-ziwa-300 hover:text-ziwa-700'
                          }`}
                        >
                          {unit.name} <span className="text-gray-400">({unit.capacity})</span>
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

      {showDenyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowDenyModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-3" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900">Deny Booking</h3>
            <textarea
              value={denialReason}
              onChange={(event) => setDenialReason(event.target.value)}
              rows={3}
              placeholder="Reason for denial (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReview('denied')}
                disabled={approving}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {approving ? 'Denying…' : 'Confirm Deny'}
              </button>
              <button onClick={() => setShowDenyModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-3" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900">Request Booking Deletion</h3>
            <p className="text-xs text-gray-500">This will submit a deletion request for admin approval. The booking will not be removed until approved.</p>
            <textarea
              value={deletionReason}
              onChange={(event) => setDeletionReason(event.target.value)}
              rows={3}
              placeholder="Reason for deletion *"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeletionRequest}
                disabled={deletionSubmitting || !deletionReason.trim()}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {deletionSubmitting ? 'Submitting…' : 'Submit Deletion Request'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
