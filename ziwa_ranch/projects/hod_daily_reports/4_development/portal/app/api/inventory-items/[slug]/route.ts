import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { canAccessDepartment } from '@/lib/department-access'

interface LibraryItem {
  item_name: string
  category: string
  occurrence_count: number
  default_unit: string | null
  default_cost_per_unit: number | null
}

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
    return NextResponse.json({ items: [], previousQuantities: {} })
  }
  if (!canAccessDepartment({ user, guest }, { id: dept.id, slug: dept.slug })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: items } = await supabase
    .from('hod_item_library')
    .select('item_name, category, occurrence_count, default_unit, default_cost_per_unit')
    .eq('department_id', dept.id)
    .eq('category', category)
    .order('occurrence_count', { ascending: false })
    .limit(100)

  // Fetch the most recent report's data for "previous values" hints
  const { data: lastReport } = await supabase
    .from('hod_daily_reports')
    .select('report_data')
    .eq('department_id', dept.id)
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  const previousQuantities: Record<string, { quantity: number; unit: string; cost_per_unit?: number }> = {}

  if (lastReport?.report_data) {
    const data = lastReport.report_data as Record<string, unknown>
    const fieldMappings: Record<string, string[]> = {
      kitchen_stock: ['stock_used', 'stock_added', 'kitchen_stock_count'],
      store_goods: ['goods_added', 'goods_taken', 'store_stock_count'],
      beverage: ['beverage_sales', 'bar_stock_count'],
    }

    const fields = fieldMappings[category] ?? []
    for (const fieldName of fields) {
      const arr = data[fieldName]
      if (Array.isArray(arr)) {
        for (const row of arr) {
          const r = row as Record<string, unknown>
          const itemName = String(r.item || r.beverage || '').trim()
          if (itemName) {
            previousQuantities[itemName.toLowerCase()] = {
              quantity: Number(r.quantity || r.quantity_sold || 0),
              unit: String(r.unit || ''),
              cost_per_unit: r.cost_per_unit ? Number(r.cost_per_unit) : undefined,
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    items: ((items ?? []) as LibraryItem[]).map((i) => ({
      name: i.item_name,
      unit: i.default_unit,
      cost_per_unit: i.default_cost_per_unit,
      occurrence_count: i.occurrence_count,
    })),
    previousQuantities,
  })
}, { allowGuest: true })
