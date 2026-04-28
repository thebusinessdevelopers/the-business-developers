import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const today = new Date().toISOString().slice(0, 10)
  const from = url.searchParams.get('from') || addDays(today, -30)
  const to = url.searchParams.get('to') || today

  const [bookingsResult, unitsResult, paymentsResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, check_in, check_out, status, booking_source, agreed_rate_per_night, created_at, booking_rooms(unit_id)')
      .lte('check_in', to)
      .gte('check_out', from),
    supabase
      .from('accommodation_units')
      .select('id')
      .eq('status', 'active'),
    supabase
      .from('booking_payments')
      .select('amount, currency')
      .gte('payment_date', from)
      .lte('payment_date', to),
  ])

  const bookings = bookingsResult.data ?? []
  const totalActiveUnits = (unitsResult.data ?? []).length
  const payments = paymentsResult.data ?? []

  const periodDays = daysBetween(from, to) || 1

  let occupiedRoomNights = 0
  let revenueUsd = 0
  let totalLeadTimeDays = 0
  let leadTimeCount = 0
  let cancelledCount = 0
  let totalCount = 0
  const sourceMap: Record<string, number> = {}

  for (const b of bookings) {
    totalCount++

    const overlapStart = b.check_in > from ? b.check_in : from
    const overlapEnd = b.check_out < to ? b.check_out : to
    const overlapNights = daysBetween(overlapStart, overlapEnd)
    const roomCount = (b.booking_rooms ?? []).length || 1

    if (b.status !== 'cancelled') {
      occupiedRoomNights += overlapNights * roomCount
    }

    if (b.status === 'cancelled') {
      cancelledCount++
    } else if (b.agreed_rate_per_night != null) {
      const nights = daysBetween(b.check_in, b.check_out)
      revenueUsd += Number(b.agreed_rate_per_night) * nights
    }

    if (b.created_at && b.check_in) {
      const created = b.created_at.slice(0, 10)
      const lead = daysBetween(created, b.check_in)
      if (lead >= 0) {
        totalLeadTimeDays += lead
        leadTimeCount++
      }
    }

    const src = b.booking_source || 'unknown'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  }

  const totalRoomNights = totalActiveUnits * periodDays
  const occupancyPct = totalRoomNights > 0 ? Math.round((occupiedRoomNights / totalRoomNights) * 1000) / 10 : 0
  const avgLeadTimeDays = leadTimeCount > 0 ? Math.round(totalLeadTimeDays / leadTimeCount) : null
  const cancellationPct = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 1000) / 10 : 0

  const totalPaymentsUsd = payments
    .filter((p) => p.currency === 'USD')
    .reduce((s, p) => s + Number(p.amount), 0)
  const totalPaymentsUgx = payments
    .filter((p) => p.currency === 'UGX')
    .reduce((s, p) => s + Number(p.amount), 0)

  const sourceBreakdown = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count, pct: Math.round((count / totalCount) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    period: { from, to, days: periodDays },
    occupancy: {
      pct: occupancyPct,
      occupied_room_nights: occupiedRoomNights,
      total_room_nights: totalRoomNights,
    },
    revenue: {
      booking_revenue_usd: Math.round(revenueUsd * 100) / 100,
      payments_usd: Math.round(totalPaymentsUsd * 100) / 100,
      payments_ugx: Math.round(totalPaymentsUgx * 100) / 100,
    },
    lead_time: { avg_days: avgLeadTimeDays },
    cancellation: { rate_pct: cancellationPct, cancelled: cancelledCount, total: totalCount },
    source_breakdown: sourceBreakdown,
  })
}, { capability: 'accommodation_manage' })
