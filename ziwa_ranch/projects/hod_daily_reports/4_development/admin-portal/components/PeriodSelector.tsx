'use client'

export type PeriodKey = 'week' | 'month' | 'quarter' | 'year'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: '7d' },
  { key: 'month', label: '30d' },
  { key: 'quarter', label: 'Q' },
  { key: 'year', label: 'Y' },
]

interface PeriodSelectorProps {
  value: PeriodKey
  onChange: (period: PeriodKey) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all min-w-[44px] ${
            value === key
              ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
