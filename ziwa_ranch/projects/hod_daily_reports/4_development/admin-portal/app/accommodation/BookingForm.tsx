'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { AccommodationUnit, AccommodationRate, RoomBasketItem, MealPlan, RateType, BookingSource, PaymentStatus, BookingStatus, ActivityBasketItem, GuestCategory, BookingPayment, BookingChangeRequest } from '@hod/shared/types'
import {
  BUILDING_LABELS, MEAL_PLAN_LABELS, RATE_TYPE_LABELS,
  BOOKING_SOURCE_LABELS, PAYMENT_STATUS_LABELS, BOOKING_STATUS_LABELS,
  nightsBetween, calculateBasketRate, calculateItemRate, addAccommodationDays,
  ACTIVITY_NAMES, GUEST_CATEGORY_LABELS, lookupActivityRate, calculateActivityLineTotal,
  calculateActivitiesSubtotals, buildDefaultActivity, formatDate,
} from '@hod/shared/config/accommodation'
import BookingActivityPanel from './BookingActivityPanel'

interface Props {
  adminId: string
  units: AccommodationUnit[]
  rates: AccommodationRate[]
  bookingId: string | null
  defaults: { unit_id?: string; date?: string }
  onClose: () => void
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
    status: 'tentative',
  }
}

export default function BookingForm({ units, rates, bookingId, defaults, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => buildInitial(defaults))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [loadingBooking, setLoadingBooking] = useState(!!bookingId)
  const [showActivity, setShowActivity] = useState(false)
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [denialReason, setDenialReason] = useState('')

  async function handleApproveAction(action: 'approved' | 'denied') {
    if (!bookingId) return
    setApproving(true)
    setError('')
    try {
      const res = await fetch('/api/accommodation/bookings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, action, denial_reason: action === 'denied' ? denialReason : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed.')
      setShowDenyModal(false)
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setApproving(false)
  }

  useEffect(() => {
    if (!bookingId) return
    setLoadingBooking(true)
    fetch(`/api/accommodation/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((b) => {
        const rooms: { unit_id: string; room_config?: RoomBasketItem | null }[] = b.booking_rooms ?? []
        let basket: RoomBasketItem[]

        if (rooms.length > 0 && rooms[0]?.room_config) {
          basket = rooms.map((r) => {
            const cfg = r.room_config as RoomBasketItem
            const u = units.find((unit) => unit.id === cfg.unit_id)
            return {
              ...cfg,
              pricing_type: cfg.pricing_type ?? u?.pricing_type ?? 'flat',
              isComplimentary: cfg.isComplimentary ?? false,
              compReason: cfg.compReason,
            }
          })
        } else {
          const roomCount = Math.max(rooms.length, 1)
          basket = rooms.map((r) => {
            const u = units.find((unit) => unit.id === r.unit_id)
            return {
              unit_id: r.unit_id,
              unit_name: u?.name ?? 'Unknown',
              rate_category: u?.rate_category ?? '',
              adults: Math.max(1, Math.round((b.adults || 1) / roomCount)),
              children: Math.round((b.children || 0) / roomCount),
              meal_plan: b.meal_plan || 'fb',
              rate_per_night: null,
              notes: '',
              pricing_type: u?.pricing_type ?? 'flat',
              isComplimentary: false,
            }
          })
        }

        const loadedActivities: ActivityBasketItem[] = (b.booking_activities ?? []).map((a: Record<string, unknown>) => ({
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

        setForm({
          guest_name: b.guest_name || '',
          guest_email: b.guest_email || '',
          guest_phone: b.guest_phone || '',
          is_private: b.is_private ?? true,
          company_name: b.company_name || '',
          check_in: b.check_in || '',
          check_out: b.check_out || '',
          basket,
          activities: loadedActivities,
          rate_type: b.rate_type || 'rack',
          booking_source: b.booking_source || 'direct',
          agent_name: b.agent_name || '',
          special_notes: b.special_notes || '',
          payment_status: b.payment_status || 'unpaid',
          status: b.status || 'tentative',
        })
        setLoadingBooking(false)
      })
      .catch(() => setLoadingBooking(false))
  }, [bookingId, units])

  useEffect(() => {
    if (bookingId || !defaults.unit_id) return
    const unit = units.find((u) => u.id === defaults.unit_id)
    if (!unit) return
    setForm((f) => {
      if (f.basket.length > 0) return f
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
      const yr = f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear()
      const suggestedRate = calculateItemRate(newItem, rates, f.rate_type, yr)
      if (suggestedRate != null) newItem.rate_per_night = suggestedRate
      return { ...f, basket: [newItem] }
    })
  }, [bookingId, defaults.unit_id, rates, units])

  const nights = form.check_in && form.check_out ? nightsBetween(form.check_in, form.check_out) : 0
  const year = form.check_in ? new Date(form.check_in).getFullYear() : new Date().getFullYear()

  const rateBreakdown = useMemo(
    () => calculateBasketRate(form.basket, rates, form.rate_type, form.check_in, form.check_out),
    [form.basket, rates, form.rate_type, form.check_in, form.check_out],
  )

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const addRoom = useCallback((unit: AccommodationUnit) => {
    if (form.basket.some((item) => item.unit_id === unit.id)) return
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
    setForm((f) => ({ ...f, basket: [...f.basket, newItem] }))
    setShowRoomPicker(false)
  }, [form.basket, rates, form.rate_type, year])

  const updateItem = useCallback((index: number, patch: Partial<RoomBasketItem>) => {
    setForm((f) => {
      const basket = [...f.basket]
      const updated = { ...basket[index], ...patch }
      if (('adults' in patch || 'children' in patch || 'meal_plan' in patch) && !('rate_per_night' in patch)) {
        const refreshed: RoomBasketItem = { ...updated, rate_per_night: null }
        const suggested = calculateItemRate(refreshed, rates, f.rate_type, f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear())
        updated.rate_per_night = suggested
      }
      basket[index] = updated
      return { ...f, basket }
    })
  }, [rates])

  const removeItem = useCallback((index: number) => {
    setForm((f) => ({ ...f, basket: f.basket.filter((_, i) => i !== index) }))
  }, [])

  const recalcItemRate = useCallback((index: number) => {
    setForm((f) => {
      const basket = [...f.basket]
      const item: RoomBasketItem = { ...basket[index], rate_per_night: null }
      const suggested = calculateItemRate(item, rates, f.rate_type, year)
      item.rate_per_night = suggested
      basket[index] = item
      return { ...f, basket }
    })
  }, [rates, year])

  const [payments, setPayments] = useState<BookingPayment[]>([])
  const [showPayments, setShowPayments] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', currency: 'USD', payment_date: '', payment_method: '', notes: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([])
  const [showChangeHistory, setShowChangeHistory] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    Promise.all([
      fetch(`/api/accommodation/bookings/${bookingId}/payments`).then((r) => r.json()),
      fetch(`/api/accommodation/change-requests?status=all&booking_id=${bookingId}`).then((r) => r.json()),
    ]).then(([paymentsData, crData]) => {
      if (Array.isArray(paymentsData)) setPayments(paymentsData)
      if (Array.isArray(crData)) setChangeRequests(crData)
    }).catch(() => {})
  }, [bookingId])

  async function handleAddPayment() {
    if (!bookingId || !paymentForm.amount || Number(paymentForm.amount) <= 0) return
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/accommodation/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          currency: paymentForm.currency,
          payment_date: paymentForm.payment_date || undefined,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes,
        }),
      })
      if (res.ok) {
        const refreshRes = await fetch(`/api/accommodation/bookings/${bookingId}/payments`)
        const refreshed = await refreshRes.json()
        if (Array.isArray(refreshed)) setPayments(refreshed)
        setPaymentForm({ amount: '', currency: 'USD', payment_date: '', payment_method: '', notes: '' })
      }
    } catch { /* handled by UI */ }
    setSavingPayment(false)
  }

  const [showActivities, setShowActivities] = useState(() => form.activities.length > 0)

  const activitySubtotals = useMemo(
    () => calculateActivitiesSubtotals(form.activities),
    [form.activities],
  )

  const addActivity = useCallback(() => {
    setForm((f) => ({ ...f, activities: [...f.activities, buildDefaultActivity(f.check_in)] }))
    setShowActivities(true)
  }, [])

  const updateActivity = useCallback((index: number, patch: Partial<ActivityBasketItem>) => {
    setForm((f) => {
      const activities = [...f.activities]
      let updated = { ...activities[index], ...patch }
      if ('activity_name' in patch || 'guest_category' in patch) {
        const rateEntry = lookupActivityRate(updated.activity_name, updated.guest_category)
        if (rateEntry) {
          updated = { ...updated, adult_rate: rateEntry.adult_rate, child_rate: rateEntry.child_rate, currency_code: rateEntry.currency_code }
        }
      }
      activities[index] = updated
      return { ...f, activities }
    })
  }, [])

  const removeActivity = useCallback((index: number) => {
    setForm((f) => ({ ...f, activities: f.activities.filter((_, i) => i !== index) }))
  }, [])

  const unitsByBuilding = useMemo(() => {
    const map = new Map<string, AccommodationUnit[]>()
    for (const u of units) {
      if (u.status !== 'active') continue
      const list = map.get(u.building) || []
      list.push(u)
      map.set(u.building, list)
    }
    return map
  }, [units])

  const selectedUnitIds = useMemo(() => new Set(form.basket.map((i) => i.unit_id)), [form.basket])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.guest_name.trim()) { setError('Guest name is required.'); return }
    if (!form.check_in || !form.check_out) { setError('Check-in and check-out dates are required.'); return }
    if (form.check_out <= form.check_in) { setError('Check-out must be after check-in.'); return }
    if (form.basket.length === 0) { setError('Add at least one room.'); return }
    if (!form.is_private && !form.company_name.trim()) { setError('Company name is required for company bookings.'); return }

    const capBreaches: string[] = []
    let totalMaxAdults = 0
    let totalMaxChildren = 0
    let totalMaxTotal = 0
    for (const item of form.basket) {
      const u = units.find((x) => x.id === item.unit_id)
      const pax = u?.pax_config
      if (!pax) {
        if (u) { totalMaxAdults += u.capacity; totalMaxTotal += u.capacity }
        continue
      }
      totalMaxAdults += pax.max_adults
      totalMaxChildren += pax.max_children
      totalMaxTotal += pax.max_total
      if (item.adults > pax.max_adults) capBreaches.push(`${item.unit_name}: ${item.adults} adults exceeds ${pax.max_adults}`)
      if (item.children > pax.max_children) capBreaches.push(`${item.unit_name}: ${item.children} children exceeds ${pax.max_children}`)
      if (item.adults + item.children > pax.max_total) capBreaches.push(`${item.unit_name}: ${item.adults + item.children} guests exceeds ${pax.max_total}`)
    }
    const totalAdults = form.basket.reduce((s, i) => s + i.adults, 0)
    const totalChildren = form.basket.reduce((s, i) => s + i.children, 0)
    if (totalAdults > totalMaxAdults) capBreaches.push(`Total adults ${totalAdults} exceeds capacity ${totalMaxAdults}`)
    if (totalChildren > totalMaxChildren && totalChildren > 0) capBreaches.push(`Total children ${totalChildren} exceeds capacity ${totalMaxChildren}`)
    if (totalAdults + totalChildren > totalMaxTotal) capBreaches.push(`Total guests ${totalAdults + totalChildren} exceeds capacity ${totalMaxTotal}`)

    let adminPaxOverride = false
    if (capBreaches.length > 0) {
      const proceed = confirm(`Room capacity exceeded:\n\n${capBreaches.join('\n')}\n\nSave anyway?`)
      if (!proceed) return
      adminPaxOverride = true
    }

    setSaving(true)
    try {
      const payload = {
        guest_name: form.guest_name,
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        is_private: form.is_private,
        company_name: form.is_private ? null : form.company_name || null,
        check_in: form.check_in,
        check_out: form.check_out,
        rate_type: form.rate_type,
        booking_source: form.booking_source,
        agent_name: form.agent_name || null,
        special_notes: form.special_notes || null,
        payment_status: form.payment_status,
        status: form.status,
        basket: form.basket,
        activities: form.activities,
        adults: totalAdults,
        children: totalChildren,
        meal_plan: form.basket[0]?.meal_plan ?? 'fb',
        agreed_rate_per_night: rateBreakdown ? rateBreakdown.perNightTotal : null,
        unit_ids: form.basket.map((i) => i.unit_id),
        adminPaxOverride,
      }

      const url = bookingId ? `/api/accommodation/bookings/${bookingId}` : '/api/accommodation/bookings'
      const method = bookingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save.')
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!bookingId || !confirm('Delete this booking? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/accommodation/bookings/${bookingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete.')
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {bookingId ? 'Edit Booking' : 'New Booking'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {loadingBooking ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading booking…</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

            {/* Guest details */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name *</label>
              <input type="text" value={form.guest_name} onChange={(e) => set('guest_name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" placeholder="guest@example.com" value={form.guest_email} onChange={(e) => set('guest_email', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input type="tel" placeholder="+256 …" value={form.guest_phone} onChange={(e) => set('guest_phone', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setForm((f) => {
                  const yr = f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear()
                  const basket = f.basket.map((item) => {
                    const cleared: RoomBasketItem = { ...item, rate_per_night: null }
                    const suggested = calculateItemRate(cleared, rates, 'rack', yr)
                    return { ...cleared, rate_per_night: suggested }
                  })
                  return { ...f, is_private: true, company_name: '', rate_type: 'rack', basket }
                })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${form.is_private ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Private
                </button>
                <button type="button" onClick={() => setForm((f) => {
                  const yr = f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear()
                  const basket = f.basket.map((item) => {
                    const cleared: RoomBasketItem = { ...item, rate_per_night: null }
                    const suggested = calculateItemRate(cleared, rates, 'sto', yr)
                    return { ...cleared, rate_per_night: suggested }
                  })
                  return { ...f, is_private: false, rate_type: 'sto', basket }
                })}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${!form.is_private ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Company
                </button>
              </div>
              {!form.is_private && (
                <input type="text" placeholder="Company name *" value={form.company_name} onChange={(e) => set('company_name', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check In *</label>
                <input type="date" value={form.check_in} onChange={(e) => { const v = e.target.value; set('check_in', v); if (v && (!form.check_out || form.check_out <= v)) set('check_out', addAccommodationDays(v, 1)) }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check Out *</label>
                <input type="date" value={form.check_out} onChange={(e) => set('check_out', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              </div>
              <div className="flex items-end">
                {nights > 0 && <span className="text-sm text-gray-500 pb-2">{nights} night{nights !== 1 ? 's' : ''}</span>}
              </div>
            </div>

            {/* Source / Status / Payment */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                <select value={form.booking_source} onChange={(e) => set('booking_source', e.target.value as BookingSource)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                  {Object.entries(BOOKING_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Booking Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value as BookingStatus)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                  {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                <select value={form.payment_status} onChange={(e) => set('payment_status', e.target.value as PaymentStatus)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {form.booking_source === 'agent' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name</label>
                <input type="text" value={form.agent_name} onChange={(e) => set('agent_name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
              </div>
            )}

            {/* Room basket */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Rooms <span className="text-gray-400 font-normal">({form.basket.length})</span>
                </label>
                <button type="button" onClick={() => setShowRoomPicker(true)} className="text-xs font-medium text-ziwa-600 hover:text-ziwa-700">
                  + Add Room
                </button>
              </div>

              {form.basket.length === 0 && (
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400">No rooms added yet.</p>
                  <button type="button" onClick={() => setShowRoomPicker(true)} className="text-xs text-ziwa-600 hover:text-ziwa-700 mt-1">
                    Add a room
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {form.basket.map((item, i) => {
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
                        <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 text-sm">&times;</button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Adults</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(i, { adults: Math.max(1, item.adults - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                            <span className="text-sm w-5 text-center">{item.adults}</span>
                            <button type="button" onClick={() => updateItem(i, { adults: item.adults + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Children</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateItem(i, { children: Math.max(0, item.children - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                            <span className="text-sm w-5 text-center">{item.children}</span>
                            <button type="button" onClick={() => updateItem(i, { children: item.children + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Meal Plan</label>
                          <select value={item.meal_plan} onChange={(e) => updateItem(i, { meal_plan: e.target.value as MealPlan })}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                            {Object.entries(MEAL_PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Rate/night ($)</label>
                          <input type="number" min={0} step={0.01}
                            value={item.rate_per_night ?? ''}
                            onChange={(e) => updateItem(i, { rate_per_night: e.target.value ? Number(e.target.value) : null })}
                            className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Room notes" value={item.notes}
                          onChange={(e) => updateItem(i, { notes: e.target.value })}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                        <button type="button" onClick={() => recalcItemRate(i)} className="text-[10px] text-gray-400 hover:text-ziwa-600 whitespace-nowrap">
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
                          <input type="checkbox" checked={item.isComplimentary}
                            onChange={(e) => updateItem(i, { isComplimentary: e.target.checked, compReason: e.target.checked ? (item.compReason ?? '') : undefined })}
                            className="rounded border-gray-300 text-ziwa-500 focus:ring-ziwa-400" />
                          Complimentary
                        </label>
                        {item.isComplimentary && (
                          <input type="text" placeholder="Reason (optional)" value={item.compReason ?? ''}
                            onChange={(e) => updateItem(i, { compReason: e.target.value })}
                            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activities (BookingActivitiesPanel) */}
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
                      <button type="button" onClick={addActivity} className="text-xs text-ziwa-600 hover:text-ziwa-700 mt-1">
                        Add an activity
                      </button>
                    </div>
                  )}

                  {form.activities.map((act, i) => {
                    const lineTotal = calculateActivityLineTotal(act)
                    return (
                      <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <select value={act.activity_name} onChange={(e) => updateActivity(i, { activity_name: e.target.value })}
                            className="text-sm font-medium text-gray-800 border-0 bg-transparent p-0 focus:ring-0 cursor-pointer">
                            {ACTIVITY_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                          </select>
                          <button type="button" onClick={() => removeActivity(i)} className="text-gray-400 hover:text-red-500 text-sm">&times;</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Guest Category</label>
                            <select value={act.guest_category} onChange={(e) => updateActivity(i, { guest_category: e.target.value as GuestCategory })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                              {(Object.entries(GUEST_CATEGORY_LABELS) as [GuestCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Date</label>
                            <input type="date" value={act.activity_date} onChange={(e) => updateActivity(i, { activity_date: e.target.value })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Adults</label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateActivity(i, { adults: Math.max(0, act.adults - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                              <span className="text-sm w-5 text-center">{act.adults}</span>
                              <button type="button" onClick={() => updateActivity(i, { adults: act.adults + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Children</label>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateActivity(i, { children: Math.max(0, act.children - 1) })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                              <span className="text-sm w-5 text-center">{act.children}</span>
                              <button type="button" onClick={() => updateActivity(i, { children: act.children + 1 })} className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Adult Rate ({act.currency_code})</label>
                            <input type="number" min={0} step={act.currency_code === 'UGX' ? 1000 : 0.01}
                              value={act.adult_rate} onChange={(e) => updateActivity(i, { adult_rate: Number(e.target.value) || 0 })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5">Child Rate ({act.currency_code})</label>
                            <input type="number" min={0} step={act.currency_code === 'UGX' ? 1000 : 0.01}
                              value={act.child_rate} onChange={(e) => updateActivity(i, { child_rate: Number(e.target.value) || 0 })}
                              className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                          </div>
                          <div className="flex items-end pb-1">
                            <span className="text-xs text-gray-400">
                              {act.currency_code === 'UGX' ? `UGX ${lineTotal.toLocaleString()}` : `$${lineTotal.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                        <input type="text" placeholder="Activity notes" value={act.notes}
                          onChange={(e) => updateActivity(i, { notes: e.target.value })}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
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

            {/* Rate type */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate Type</label>
                <select value={form.rate_type} onChange={(e) => { const newType = e.target.value as RateType; setForm((f) => { const yr = f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear(); const basket = f.basket.map((item) => { const cleared: RoomBasketItem = { ...item, rate_per_night: null }; const suggested = calculateItemRate(cleared, rates, newType, yr); return { ...cleared, rate_per_night: suggested }; }); const is_private = newType === 'sto' ? false : (f.is_private || !f.company_name.trim()); return { ...f, rate_type: newType, basket, is_private } }) }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                  {Object.entries(RATE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex items-end pb-2">
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Special Notes</label>
              <textarea value={form.special_notes} onChange={(e) => set('special_notes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
            </div>

            {/* Payment history */}
            {bookingId && (
              <div>
                <button type="button" onClick={() => setShowPayments(!showPayments)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 mb-2">
                  <span className={`inline-block transition-transform ${showPayments ? 'rotate-90' : ''}`}>▶</span>
                  Payments <span className="text-gray-400 font-normal">({payments.length})</span>
                </button>
                {showPayments && (
                  <div className="space-y-2">
                    {payments.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Date</th>
                              <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Amount</th>
                              <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Method</th>
                              <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Notes</th>
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
                                <td className="px-3 py-1.5 text-gray-500 truncate max-w-[120px]">{p.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" min={0} step={0.01} placeholder="Amount" value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                      <select value={paymentForm.currency} onChange={(e) => setPaymentForm((f) => ({ ...f, currency: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400">
                        <option value="USD">USD</option>
                        <option value="UGX">UGX</option>
                      </select>
                      <input type="date" value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                      <input type="text" placeholder="Method" value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Payment notes" value={paymentForm.notes}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400" />
                      <button type="button" onClick={handleAddPayment} disabled={savingPayment || !paymentForm.amount}
                        className="text-xs font-medium text-white bg-ziwa-500 hover:bg-ziwa-600 disabled:opacity-50 px-3 py-1.5 rounded transition-colors">
                        {savingPayment ? 'Saving…' : 'Record Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change request history */}
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
                        <div className="text-gray-400 flex items-center gap-2">
                          <span>{formatDate(cr.created_at)}</span>
                          {cr.reviewed_at && <span>· Reviewed {formatDate(cr.reviewed_at)}</span>}
                          {cr.review_note && <span>· {cr.review_note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Approve/Deny for hod_pending bookings */}
            {bookingId && form.status === 'hod_pending' && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-800 font-medium flex-1">This booking is awaiting approval.</span>
                <button type="button" onClick={() => handleApproveAction('approved')} disabled={approving}
                  className="text-sm font-medium text-green-600 border border-green-300 rounded px-3 py-1.5 hover:bg-green-50 disabled:opacity-50 transition-colors">
                  Approve
                </button>
                <button type="button" onClick={() => setShowDenyModal(true)} disabled={approving}
                  className="text-sm font-medium text-red-600 border border-red-300 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors">
                  Deny
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-ziwa-500 hover:bg-ziwa-600 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors">
                {saving ? 'Saving…' : bookingId ? 'Update Booking' : 'Create Booking'}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              {bookingId && (
                <>
                  <button type="button" onClick={() => setShowActivity(true)} className="ml-auto text-sm text-gray-500 hover:text-gray-700">Activity</button>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Room picker modal */}
      {showRoomPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowRoomPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Select Room</h3>
              <button onClick={() => setShowRoomPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-3 space-y-3">
              {Array.from(unitsByBuilding.entries()).map(([building, bUnits]) => (
                <div key={building}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{BUILDING_LABELS[building as keyof typeof BUILDING_LABELS] ?? building}</p>
                  <div className="flex flex-wrap gap-1">
                    {bUnits.map((u) => {
                      const alreadyAdded = selectedUnitIds.has(u.id)
                      return (
                        <button key={u.id} type="button" disabled={alreadyAdded}
                          onClick={() => addRoom(u)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            alreadyAdded
                              ? 'bg-ziwa-100 border-ziwa-400 text-ziwa-700 font-medium opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-ziwa-300 hover:text-ziwa-700'
                          }`}>
                          {u.name} <span className="text-gray-400">({u.pax_config?.max_total ?? u.capacity})</span>
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

      {showActivity && bookingId && (
        <BookingActivityPanel bookingId={bookingId} onClose={() => setShowActivity(false)} />
      )}

      {showDenyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setShowDenyModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900">Deny Booking</h3>
            <textarea
              value={denialReason}
              onChange={e => setDenialReason(e.target.value)}
              rows={3}
              placeholder="Reason for denial (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
            />
            <div className="flex gap-2">
              <button onClick={() => handleApproveAction('denied')} disabled={approving}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors">
                {approving ? 'Denying…' : 'Confirm Deny'}
              </button>
              <button onClick={() => setShowDenyModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
