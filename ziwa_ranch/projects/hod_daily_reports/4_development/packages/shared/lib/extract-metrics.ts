import type { DepartmentFormConfig, FormField } from '../types'
import { isSectionMarkedNA } from './na-markers'

export interface MetricValue {
  field: string
  label: string
  section: string
  value: number
}

export interface DepartmentMetrics {
  department: string
  slug: string
  reportDate: string
  metrics: MetricValue[]
}

function extractNumericFromField(
  field: FormField,
  sectionTitle: string,
  data: Record<string, unknown>,
): MetricValue[] {
  const results: MetricValue[] = []

  if (field.type === 'number' && !field.stepper) {
    const raw = data[field.name]
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    if (!isNaN(num)) {
      results.push({ field: field.name, label: field.label, section: sectionTitle, value: num })
    }
  }

  if (field.type === 'number' && field.stepper) {
    const raw = data[field.name]
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    if (!isNaN(num)) {
      results.push({ field: field.name, label: field.label, section: sectionTitle, value: num })
    }
  }

  if (field.type === 'inventory_grid') {
    const items = data[field.name]
    if (Array.isArray(items)) {
      let totalQty = 0
      let totalCost = 0
      for (const item of items) {
        const q = typeof item === 'object' && item !== null ? (item as Record<string, unknown>).quantity : undefined
        const c = typeof item === 'object' && item !== null ? (item as Record<string, unknown>).cost : undefined
        if (typeof q === 'number') totalQty += q
        if (typeof c === 'number') totalCost += c
      }
      if (items.length > 0 && Number.isFinite(totalQty)) {
        results.push({ field: `${field.name}_total_qty`, label: `${field.label} (total qty)`, section: sectionTitle, value: totalQty })
      }
      if (totalCost > 0) {
        results.push({ field: `${field.name}_total_cost`, label: `${field.label} (total cost)`, section: sectionTitle, value: totalCost })
      }
    }
  }

  if (field.type === 'repeater' && field.sub_fields) {
    const rows = data[field.name]
    if (Array.isArray(rows) && rows.length > 0) {
      results.push({ field: `${field.name}_count`, label: `${field.label} (count)`, section: sectionTitle, value: rows.length })
      for (const sf of field.sub_fields) {
        if (sf.type === 'number') {
          let total = 0
          for (const row of rows) {
            const v = typeof row === 'object' && row !== null ? (row as Record<string, unknown>)[sf.name] : undefined
            if (typeof v === 'number') total += v
            else if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) total += n }
          }
          if (Number.isFinite(total)) {
            results.push({ field: `${field.name}_${sf.name}_total`, label: `${field.label} — ${sf.label} (total)`, section: sectionTitle, value: total })
          }
        }
      }
    }
  }

  return results
}

export function extractKeyMetrics(
  reportData: Record<string, unknown>,
  formConfig: DepartmentFormConfig,
): MetricValue[] {
  const metrics: MetricValue[] = []

  for (const section of formConfig.sections) {
    if (isSectionMarkedNA(section, reportData)) continue

    for (const field of section.fields) {
      metrics.push(...extractNumericFromField(field, section.title, reportData))
    }
  }

  return metrics
}

export function formatMetricsForPrompt(deptMetrics: DepartmentMetrics[]): string {
  const lines: string[] = []

  for (const dm of deptMetrics) {
    if (dm.metrics.length === 0) continue
    const metricStr = dm.metrics
      .map((m) => `${m.label}: ${m.value}`)
      .join(', ')
    lines.push(`[${dm.reportDate}] ${dm.department}: ${metricStr}`)
  }

  return lines.join('\n')
}
