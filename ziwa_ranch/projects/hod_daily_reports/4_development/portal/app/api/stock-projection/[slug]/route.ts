import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

interface StockItem {
  item: string
  quantity: number
  unit: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const date = request.nextUrl.searchParams.get('date')
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: dept } = await supabase
    .from('hod_departments')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!dept) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  const stockType = slug === 'food-and-beverage' ? 'bar' : slug === 'kitchen' ? 'kitchen' : 'store'

  // Find most recent verified stock on or before the given date
  const { data: verifiedStock } = await supabase
    .from('hod_verified_stock')
    .select('entry_date, items')
    .eq('department_id', dept.id)
    .eq('stock_type', stockType)
    .lte('entry_date', date)
    .order('entry_date', { ascending: false })
    .limit(1)
    .single()

  if (!verifiedStock) {
    return NextResponse.json({ items: [], message: 'No verified stock found' })
  }

  const baseline = (verifiedStock.items as StockItem[]) || []
  const sinceDate = verifiedStock.entry_date

  // Fetch all daily reports for this department from the day after verified stock through the given date
  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('report_data, report_date')
    .eq('department_id', dept.id)
    .gt('report_date', sinceDate)
    .lte('report_date', date)
    .order('report_date')

  const projected = new Map<string, StockItem>()
  for (const item of baseline) {
    projected.set(item.item.toLowerCase().trim(), { ...item })
  }

  if (reports) {
    for (const report of reports) {
      const data = report.report_data as Record<string, unknown>

      if (stockType === 'bar') {
        const sales = data.beverage_sales as { beverage?: string; quantity_sold?: number }[] | undefined
        if (Array.isArray(sales)) {
          for (const sale of sales) {
            if (!sale.beverage) continue
            const key = sale.beverage.toLowerCase().trim()
            const existing = projected.get(key)
            if (existing) {
              existing.quantity -= Number(sale.quantity_sold || 0)
            }
          }
        }
      } else if (stockType === 'kitchen') {
        const added = data.stock_added as { item?: string; quantity?: number }[] | undefined
        if (Array.isArray(added)) {
          for (const entry of added) {
            if (!entry.item) continue
            const key = entry.item.toLowerCase().trim()
            const existing = projected.get(key)
            if (existing) {
              existing.quantity += Number(entry.quantity || 0)
            } else {
              projected.set(key, { item: entry.item, quantity: Number(entry.quantity || 0), unit: '' })
            }
          }
        }

        const used = data.stock_used as { item?: string; quantity?: number }[] | undefined
        if (Array.isArray(used)) {
          for (const entry of used) {
            if (!entry.item) continue
            const key = entry.item.toLowerCase().trim()
            const existing = projected.get(key)
            if (existing) {
              existing.quantity -= Number(entry.quantity || 0)
            }
          }
        }
      } else {
        const added = data.goods_added as { item?: string; quantity?: number }[] | undefined
        if (Array.isArray(added)) {
          for (const entry of added) {
            if (!entry.item) continue
            const key = entry.item.toLowerCase().trim()
            const existing = projected.get(key)
            if (existing) {
              existing.quantity += Number(entry.quantity || 0)
            } else {
              projected.set(key, { item: entry.item, quantity: Number(entry.quantity || 0), unit: '' })
            }
          }
        }

        const taken = data.goods_taken as { item?: string; quantity?: number }[] | undefined
        if (Array.isArray(taken)) {
          for (const entry of taken) {
            if (!entry.item) continue
            const key = entry.item.toLowerCase().trim()
            const existing = projected.get(key)
            if (existing) {
              existing.quantity -= Number(entry.quantity || 0)
            }
          }
        }
      }
    }
  }

  const items = Array.from(projected.values()).sort((a, b) => a.item.localeCompare(b.item))

  return NextResponse.json({ items, baselineDate: sinceDate })
}
