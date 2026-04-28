import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authError = await verifyAdminAuth('report_view')
    if (authError) return authError

    const { slug } = await params
    const category = request.nextUrl.searchParams.get('category')
    if (!category) {
      return NextResponse.json({ items: [] })
    }

    const supabase = createServerClient()

    const { data: dept } = await supabase
      .from('hod_departments')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!dept) {
      return NextResponse.json({ items: [] })
    }

    const { data: items } = await supabase
      .from('hod_item_library')
      .select('item_name')
      .eq('department_id', dept.id)
      .eq('category', category)
      .order('occurrence_count', { ascending: false })
      .limit(50)

    return NextResponse.json({
      items: (items ?? []).map((i) => i.item_name),
    })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
