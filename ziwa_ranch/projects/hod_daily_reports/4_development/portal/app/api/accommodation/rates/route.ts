import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canManageAccommodationBookings } from '@hod/shared/config/accommodation'

export const GET = withAuth(async ({ user, request }) => {
  if (!user?.department_slug || !canManageAccommodationBookings(user.department_slug)) {
    return NextResponse.json({ error: 'Your department cannot access accommodation rates.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const url = new URL(request.url)
  const year = url.searchParams.get('year')
  const category = url.searchParams.get('category')

  let query = supabase
    .from('accommodation_rates')
    .select('*')
    .order('rate_category')
    .order('meal_plan')
    .order('rate_type')

  if (year) {
    const parsedYear = Number(year)
    if (!Number.isInteger(parsedYear)) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
    }
    query = query.eq('year', parsedYear)
  }
  if (category) query = query.eq('rate_category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})
