'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface ActivityFilterProps {
  currentAction: string
  actions: string[]
  labels: Record<string, string>
}

export default function ActivityFilter({ currentAction, actions, labels }: ActivityFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <select
      value={currentAction}
      onChange={(e) => {
        const val = e.target.value
        const tab = searchParams.get('tab')
        const parts: string[] = []
        if (val) parts.push(`action=${val}`)
        if (tab) parts.push(`tab=${tab}`)
        router.push(parts.length > 0 ? `/activity?${parts.join('&')}` : '/activity')
      }}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
    >
      <option value="">All actions</option>
      {actions.map((a) => (
        <option key={a} value={a}>{labels[a] ?? a}</option>
      ))}
    </select>
  )
}
