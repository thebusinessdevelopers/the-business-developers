'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import KpiCard from './KpiCard'
import PeriodSelector, { type PeriodKey } from './PeriodSelector'

interface KpiCardData {
  title: string
  value: string
  subtitle: string
  trend: 'up' | 'down' | 'flat'
  trendIsPositive: boolean
  href?: string
}

interface KpiPillar {
  id: string
  label: string
  href: string
  cards: KpiCardData[]
}

interface KpiResponse {
  period: string
  periodLabel: string
  pillars: KpiPillar[]
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-200 rounded" />
    </div>
  )
}

function SkeletonPillar() {
  return (
    <div>
      <div className="h-4 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

export default function KpiDashboard() {
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [data, setData] = useState<KpiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchKpis = useCallback(async (p: PeriodKey) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/kpis?period=${p}`)
      if (res.ok) setData(await res.json())
    } catch {
      /* keep stale data visible */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKpis(period) }, [period, fetchKpis])

  const isRefreshing = loading && data !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Operational command centre.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }, (_, i) => <SkeletonPillar key={i} />)}
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}>
          {(data?.pillars ?? []).map((pillar) => (
            <section key={pillar.id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {pillar.label}
                </h2>
                <Link
                  href={pillar.href}
                  className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
                >
                  View &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pillar.cards.map((card) => (
                  <KpiCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    subtitle={card.subtitle}
                    trend={card.trend}
                    trendIsPositive={card.trendIsPositive}
                    href={card.href}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
