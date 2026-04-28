import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const bookingId = url.searchParams.get('booking_id')

  if (!bookingId) return NextResponse.json({ error: 'booking_id required.' }, { status: 400 })

  const { data, error } = await supabase
    .from('booking_activity_log')
    .select('*, actor:actor_user_id(hod_name)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}, { capability: 'accommodation_manage' })
