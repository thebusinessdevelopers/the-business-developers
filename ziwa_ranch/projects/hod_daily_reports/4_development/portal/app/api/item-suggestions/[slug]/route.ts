import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { canAccessDepartment } from '@/lib/department-access'

export const GET = withAuth(async (
  { user, guest, request },
  context?: { params: Promise<{ slug: string }> }
) => {
  const slug = (await context?.params)?.slug
  const category = request.nextUrl.searchParams.get('category')

  if (!slug || !category) {
    return NextResponse.json({ error: 'category parameter required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: dept } = await supabase
    .from('hod_departments')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (!dept) {
    return NextResponse.json({ items: [] })
  }
  if (!canAccessDepartment({ user, guest }, { id: dept.id, slug: dept.slug })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: items } = await supabase
    .from('hod_item_library')
    .select('item_name, occurrence_count')
    .eq('department_id', dept.id)
    .eq('category', category)
    .order('occurrence_count', { ascending: false })
    .limit(50)

  return NextResponse.json({
    items: (items ?? []).map((i) => i.item_name),
  })
}, { allowGuest: true })
