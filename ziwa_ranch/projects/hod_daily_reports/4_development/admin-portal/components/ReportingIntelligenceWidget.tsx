'use client'

import { useState } from 'react'
import Link from 'next/link'

type Window = '7d' | '30d'

interface DeptStat {
  id: string
  name: string
  rate7: number
  rate30: number
  late7: number
  late30: number
  warning7: number
  missed7: number
  missed30: number
  lastReportDate: string | null
  daysSinceLast: number
}

interface ReportingIntelligenceWidgetProps {
  departments: DeptStat[]
  urgentToday: number
}

function WindowToggle({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const options: { key: Window; label: string }[] = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
  ]
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
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

export default function ReportingIntelligenceWidget({ departments, urgentToday }: ReportingIntelligenceWidgetProps) {
  const [window, setWindow] = useState<Window>('7d')

  const is7 = window === '7d'
  const totalMissed = departments.reduce((sum, d) => sum + (is7 ? d.missed7 : d.missed30), 0)
  const avgRate = departments.length > 0
    ? Math.round(departments.reduce((sum, d) => sum + (is7 ? d.rate7 : d.rate30), 0) / departments.length)
    : 0

  const sorted = [...departments].sort((a, b) => {
    const rateA = is7 ? a.rate7 : a.rate30
    const rateB = is7 ? b.rate7 : b.rate30
    return rateA - rateB
  })

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Reporting Intelligence</h2>
        <WindowToggle value={window} onChange={setWindow} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{avgRate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Submission rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className={`text-2xl font-bold ${totalMissed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalMissed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Missed reports</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className={`text-2xl font-bold ${urgentToday > 0 ? 'text-red-600' : 'text-gray-900'}`}>{urgentToday}</p>
          <p className="text-xs text-gray-500 mt-0.5">Urgent today</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {sorted.map((dept) => {
          const rate = is7 ? dept.rate7 : dept.rate30
          const late = is7 ? dept.late7 : dept.late30
          const warn = is7 ? dept.warning7 : 0

          return (
            <div key={dept.id} className="px-5 py-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
              <p className="text-sm font-medium text-gray-900 sm:w-44 sm:flex-shrink-0">{dept.name}</p>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{rate}%</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 sm:flex-shrink-0 sm:w-36">
                {late > 0 && <span className="text-red-500">{late} late</span>}
                {warn > 0 && <span className="text-amber-600">{warn} warn</span>}
                {dept.daysSinceLast >= 3 && (
                  <span className="text-red-500">{dept.daysSinceLast}d gap</span>
                )}
                {late === 0 && warn === 0 && dept.daysSinceLast < 3 && (
                  <span className="text-green-600">On track</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center pt-4">
        <Link href="/operations" className="text-sm text-ziwa-600 hover:text-ziwa-700 font-medium">
          View more &rarr;
        </Link>
      </div>
    </section>
  )
}
