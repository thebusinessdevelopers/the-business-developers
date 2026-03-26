import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

interface HarvestFieldRule {
  fieldName: string
  subFieldName: string
  category: string
  unitField?: string
  costField?: string
}

interface HarvestRule {
  slugs: string[]
  fields: HarvestFieldRule[]
}

const HARVEST_RULES: HarvestRule[] = [
  {
    slugs: ['food-and-beverage'],
    fields: [
      { fieldName: 'breakfast_dishes', subFieldName: 'dish', category: 'dish' },
      { fieldName: 'lunch_dishes', subFieldName: 'dish', category: 'dish' },
      { fieldName: 'dinner_dishes', subFieldName: 'dish', category: 'dish' },
      { fieldName: 'beverage_sales', subFieldName: 'beverage', category: 'beverage' },
      { fieldName: 'bar_stock_count', subFieldName: 'item', category: 'beverage', unitField: 'unit' },
    ],
  },
  {
    slugs: ['kitchen'],
    fields: [
      { fieldName: 'kitchen_stock_count', subFieldName: 'item', category: 'kitchen_stock', unitField: 'unit', costField: 'cost_per_unit' },
      { fieldName: 'stock_added', subFieldName: 'item', category: 'kitchen_stock', unitField: 'unit', costField: 'cost_per_unit' },
      { fieldName: 'stock_used', subFieldName: 'item', category: 'kitchen_stock', unitField: 'unit', costField: 'cost_per_unit' },
    ],
  },
  {
    slugs: ['store'],
    fields: [
      { fieldName: 'goods_added', subFieldName: 'item', category: 'store_goods', unitField: 'unit' },
      { fieldName: 'goods_taken', subFieldName: 'item', category: 'store_goods' },
      { fieldName: 'store_stock_count', subFieldName: 'item', category: 'store_goods', unitField: 'unit' },
    ],
  },
  {
    slugs: ['drivers-and-mechanics'],
    fields: [
      { fieldName: 'vehicle_usage', subFieldName: 'plate', category: 'vehicle' },
    ],
  },
  {
    slugs: ['hq-maintenance'],
    fields: [
      { fieldName: 'work_done', subFieldName: 'materials_used', category: 'materials' },
    ],
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reportId = body.reportId as string
    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('department_id, report_data, report_date, hod_departments(slug)')
      .eq('id', reportId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const dept = report.hod_departments as unknown as { slug: string }
    const slug = dept.slug
    const departmentId = report.department_id
    const reportData = report.report_data as Record<string, unknown>
    const reportDate = report.report_date as string

    const rule = HARVEST_RULES.find((r) => r.slugs.includes(slug))
    if (!rule) {
      return NextResponse.json({ harvested: 0 })
    }

    let harvested = 0

    for (const fieldRule of rule.fields) {
      const rows = reportData[fieldRule.fieldName]
      if (!Array.isArray(rows)) continue

      for (const row of rows) {
        const r = row as Record<string, unknown>
        const rawName = r[fieldRule.subFieldName]
        if (!rawName || typeof rawName !== 'string') continue

        const itemName = rawName.trim().toLowerCase()
        if (!itemName) continue

        const upsertData: Record<string, unknown> = {
          department_id: departmentId,
          category: fieldRule.category,
          item_name: itemName,
          first_seen: reportDate,
          last_seen: reportDate,
          occurrence_count: 1,
        }

        if (fieldRule.unitField && r[fieldRule.unitField]) {
          upsertData.default_unit = String(r[fieldRule.unitField]).trim().toLowerCase()
        }
        if (fieldRule.costField && r[fieldRule.costField]) {
          const cost = Number(r[fieldRule.costField])
          if (cost > 0) upsertData.default_cost_per_unit = cost
        }

        const { error } = await supabase
          .from('hod_item_library')
          .upsert(upsertData, {
            onConflict: 'department_id,category,item_name',
            ignoreDuplicates: false,
          })

        if (!error) harvested++
      }
    }

    return NextResponse.json({ harvested })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
