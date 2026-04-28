import Link from 'next/link'

interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  trend: 'up' | 'down' | 'flat'
  trendIsPositive?: boolean
  href?: string
}

function TrendArrow({ trend, positive }: { trend: 'up' | 'down' | 'flat'; positive: boolean }) {
  if (trend === 'flat') return <span className="text-gray-400 text-sm">—</span>
  const isGood = (trend === 'up') === positive
  const color = isGood ? 'text-green-600' : 'text-red-500'
  return <span className={`${color} text-sm font-medium`}>{trend === 'up' ? '▲' : '▼'}</span>
}

export default function KpiCard({ title, value, subtitle, trend, trendIsPositive = true, href }: KpiCardProps) {
  const card = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${href ? 'hover:border-gray-300 hover:shadow-sm transition-all' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {href && <span className="text-gray-300 text-xs">↗</span>}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <TrendArrow trend={trend} positive={trendIsPositive} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  )

  if (href) return <Link href={href}>{card}</Link>
  return card
}
