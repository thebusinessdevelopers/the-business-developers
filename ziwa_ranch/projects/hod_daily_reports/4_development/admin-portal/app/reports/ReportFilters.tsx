'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  departments: { name: string; slug: string }[]
  defaultFrom: string
}

export default function ReportFilters({ departments, defaultFrom }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/reports?${params.toString()}`)
  }

  const inputClass =
    'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <select
        value={searchParams.get('department') ?? ''}
        onChange={(e) => update('department', e.target.value)}
        className={inputClass}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.slug} value={d.slug}>{d.name}</option>
        ))}
      </select>

      <input
        type="date"
        value={searchParams.get('from') ?? defaultFrom}
        onChange={(e) => update('from', e.target.value)}
        className={inputClass}
        placeholder="From"
      />

      <input
        type="date"
        value={searchParams.get('to') ?? ''}
        onChange={(e) => update('to', e.target.value)}
        className={inputClass}
        placeholder="To"
      />

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={searchParams.get('late') === 'true'}
          onChange={(e) => update('late', e.target.checked ? 'true' : '')}
          className="rounded border-gray-300 text-ziwa-500 focus:ring-ziwa-500"
        />
        Late only
      </label>

      <select
        value={searchParams.get('reviewed') ?? ''}
        onChange={(e) => update('reviewed', e.target.value)}
        className={inputClass}
      >
        <option value="">All reviews</option>
        <option value="reviewed">Reviewed</option>
        <option value="unreviewed">Unreviewed</option>
      </select>
    </div>
  )
}
