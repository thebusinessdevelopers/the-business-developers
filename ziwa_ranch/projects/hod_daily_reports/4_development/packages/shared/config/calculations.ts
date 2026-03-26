export interface CalculationRule {
  slug: string
  calculations: FieldCalculation[]
}

export interface FieldCalculation {
  targetField: string
  label: string
  type: 'simple' | 'repeater_diff'
  formula: (values: Record<string, unknown>) => number | null
}

export const CALCULATION_RULES: CalculationRule[] = [
  {
    slug: 'drivers-and-mechanics',
    calculations: [
      {
        targetField: 'vehicle_usage',
        label: 'Distance today',
        type: 'repeater_diff',
        formula: () => null,
      },
    ],
  },
  {
    slug: 'kitchen',
    calculations: [
      {
        targetField: 'daily_food_cost',
        label: 'Calculated food cost',
        type: 'simple',
        formula: (values) => {
          const used = values.stock_used as { quantity?: number | string; cost_per_unit?: number | string }[] | undefined
          if (!Array.isArray(used) || used.length === 0) return null
          const total = used.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.cost_per_unit || 0)), 0)
          return total > 0 ? total : null
        },
      },
    ],
  },
  {
    slug: 'accounts',
    calculations: [
      {
        targetField: 'petty_cash_end',
        label: 'Suggested closing balance',
        type: 'simple',
        formula: (values) => {
          const start = Number(values.petty_cash_start) || 0
          const receivables = Number(values.receivables) || 0
          const payments = values.payments as { amount?: number | string }[] | undefined
          const totalPayments = Array.isArray(payments)
            ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : 0

          if (start === 0 && receivables === 0) return null
          return start + receivables - totalPayments
        },
      },
    ],
  },
]

export function getCalculationsForSlug(slug: string): FieldCalculation[] {
  return CALCULATION_RULES.find((r) => r.slug === slug)?.calculations ?? []
}

export function calculateVehicleDistance(
  opening: number | string,
  closing: number | string
): number | null {
  const open = Number(opening)
  const close = Number(closing)
  if (!open || !close || close <= open) return null
  return close - open
}
