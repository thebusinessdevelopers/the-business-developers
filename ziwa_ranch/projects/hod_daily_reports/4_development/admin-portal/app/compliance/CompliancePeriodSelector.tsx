'use client'

import { useRouter } from 'next/navigation'

interface CompliancePeriodSelectorProps {
  currentDays: number
}

export default function CompliancePeriodSelector({ currentDays }: CompliancePeriodSelectorProps) {
  const router = useRouter()
  const periods = [7, 14, 30]

  return (
    <div className="flex gap-1">
      {periods.map((days) => (
        <button
          key={days}
          onClick={() => router.push(`/compliance?days=${days}`)}
          className={`text-xs font-medium rounded-md px-3 py-1.5 transition-colors ${
            currentDays === days
              ? 'bg-ziwa-500 text-white'
              : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {days}d
        </button>
      ))}
    </div>
  )
}
