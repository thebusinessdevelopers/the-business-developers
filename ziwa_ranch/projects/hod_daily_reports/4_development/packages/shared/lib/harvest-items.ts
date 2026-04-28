import { toTitleCase } from './fuzzy-search'

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

interface HarvestResult {
  harvested: number
  skipped: boolean
  reason?: string
}

function getDeptSlug(raw: unknown): string | null {
  const dept = raw as { slug?: string } | { slug?: string }[] | null
  const slug = Array.isArray(dept) ? dept[0]?.slug : dept?.slug
  return slug ?? null
}

export async function harvestItemsFromReportId(
  supabase: any,
  reportId: string
): Promise<HarvestResult> {
  const { data: report, error } = await supabase
    .from('hod_daily_reports')
    .select('department_id, report_data, report_date, hod_departments(slug)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    throw new Error(error?.message ?? 'Report not found')
  }

  const slug = getDeptSlug(report.hod_departments)
  if (!slug) return { harvested: 0, skipped: true, reason: 'department_slug_missing' }

  const rule = HARVEST_RULES.find((r) => r.slugs.includes(slug))
  if (!rule) return { harvested: 0, skipped: true, reason: 'no_rule_for_department' }

  const departmentId = report.department_id as string
  const reportData = (report.report_data ?? {}) as Record<string, unknown>
  const reportDate = report.report_date as string

  let harvested = 0

  for (const fieldRule of rule.fields) {
    const rows = reportData[fieldRule.fieldName]
    if (!Array.isArray(rows)) continue

    for (const row of rows) {
      const valueRow = row as Record<string, unknown>
      const rawName = valueRow[fieldRule.subFieldName]
      if (!rawName || typeof rawName !== 'string') continue

      const itemName = toTitleCase(rawName)
      if (!itemName) continue

      const upsertData: Record<string, unknown> = {
        department_id: departmentId,
        category: fieldRule.category,
        item_name: itemName,
        first_seen: reportDate,
        last_seen: reportDate,
        occurrence_count: 1,
      }

      if (fieldRule.unitField) {
        const unit = valueRow[fieldRule.unitField]
        if (typeof unit === 'string' && unit.trim().length > 0) {
          upsertData.default_unit = unit.trim()
        }
      }

      if (fieldRule.costField) {
        const rawCost = valueRow[fieldRule.costField]
        const numericCost = typeof rawCost === 'number' ? rawCost : Number(rawCost)
        if (!Number.isNaN(numericCost) && numericCost > 0) {
          upsertData.default_cost_per_unit = numericCost
        }
      }

      const { error: upsertError } = await supabase
        .from('hod_item_library')
        .upsert(upsertData, {
          onConflict: 'department_id,category,item_name',
          ignoreDuplicates: false,
        })

      if (!upsertError) harvested++
    }
  }

  return { harvested, skipped: false }
}
