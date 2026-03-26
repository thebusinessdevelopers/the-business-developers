'use client'

import { useRouter } from 'next/navigation'

interface ActivityFilterProps {
  currentAction: string
  actions: string[]
  labels: Record<string, string>
}

export default function ActivityFilter({ currentAction, actions, labels }: ActivityFilterProps) {
  const router = useRouter()

  return (
    <select
      value={currentAction}
      onChange={(e) => {
        const val = e.target.value
        router.push(val ? `/activity?action=${val}` : '/activity')
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
