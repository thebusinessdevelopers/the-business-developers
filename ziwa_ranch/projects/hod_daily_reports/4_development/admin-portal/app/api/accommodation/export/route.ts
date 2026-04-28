import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const format = url.searchParams.get('format') || 'csv'

  if (!from || !to) return NextResponse.json({ error: 'from and to required.' }, { status: 400 })

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, booking_rooms(unit_id, accommodation_units(name, building))')
    .lte('check_in', to)
    .gte('check_out', from)
    .neq('status', 'cancelled')
    .order('check_in')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (bookings ?? []).map((b) => {
    const rooms = (b.booking_rooms ?? [])
      .map((br: { accommodation_units: { name: string } }) => br.accommodation_units?.name)
      .filter(Boolean)
      .join(', ')
    return {
      Guest: b.guest_name,
      Company: b.company_name || '',
      'Check In': b.check_in,
      'Check Out': b.check_out,
      Nights: Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000),
      Rooms: rooms,
      'Meal Plan': b.meal_plan.toUpperCase(),
      Adults: b.adults,
      Children: b.children,
      Source: b.booking_source,
      'Rate Type': b.rate_type,
      'Rate/Night': b.agreed_rate_per_night ?? '',
      Payment: b.payment_status,
      Status: b.status,
      Notes: b.special_notes || '',
    }
  })

  if (format === 'csv') {
    if (rows.length === 0) {
      return new NextResponse('No bookings found.', {
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = String(r[h as keyof typeof r] ?? '')
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        }).join(',')
      ),
    ]
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const period = from === to ? from : `${from}_to_${to}`
    const username = admin.username?.replace(/\./g, '_') || 'admin'
    const filename = `ziwa_bookings_accommodation_${period}_by_${username}_${ts}.csv`
    return new NextResponse(csvLines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ rows })
}, { capability: 'accommodation_manage' })
