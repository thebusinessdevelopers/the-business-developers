import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const year = url.searchParams.get('year')
  const category = url.searchParams.get('category')

  let query = supabase.from('accommodation_rates').select('*').order('rate_category').order('meal_plan').order('rate_type')

  if (year) query = query.eq('year', Number(year))
  if (category) query = query.eq('rate_category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}, { capability: 'accommodation_manage' })
