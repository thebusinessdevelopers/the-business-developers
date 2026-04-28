import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').at(-2)

  const { data, error } = await supabase
    .from('booking_payments')
    .select('*')
    .eq('booking_id', id)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}, { capability: 'accommodation_manage' })

export const POST = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').at(-2)
  const body = await request.json()

  const { amount, currency, payment_date, payment_method, notes } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('booking_payments')
    .insert({
      booking_id: id,
      amount,
      currency: currency || 'USD',
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_method: payment_method?.trim() || null,
      recorded_by: admin.id,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: id,
    action: 'payment_recorded',
    actor_user_id: admin.id,
    details: { payment_id: data.id, amount, currency: currency || 'USD' },
  })).catch((e) => console.error('Activity log insert failed:', e))

  return NextResponse.json({ id: data.id })
}, { capability: 'accommodation_manage' })
