import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const includeInactive = url.searchParams.get('include_inactive') === '1'

  let query = supabase
    .from('accommodation_units')
    .select('*')
    .order('sort_order')

  if (!includeInactive) query = query.neq('status', 'inactive')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}, { capability: 'accommodation_manage' })

export const PUT = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'Missing unit id.' }, { status: 400 })

  const { error } = await supabase.from('accommodation_units').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminActivity(admin.id, 'unit_updated', { unit_id: id, fields: Object.keys(fields) })
  return NextResponse.json({ success: true })
}, { capability: 'accommodation_manage' })
