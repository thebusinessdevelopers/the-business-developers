'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'

interface NewReportFormProps {
  config: DepartmentFormConfig
  departmentId: string
  departmentSlug: string
  lockedDate: string
  prefillData?: Record<string, unknown> | null
  currentUserId: string | null
  currentUserName: string | null
}

export default function NewReportForm({
  config,
  departmentId,
  departmentSlug,
  lockedDate,
  prefillData,
  currentUserId,
  currentUserName,
}: NewReportFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [lastReportId, setLastReportId] = useState<string | null>(null)
  const [stockProjection, setStockProjection] = useState<{ item: string; quantity: number; unit: string }[] | null>(null)

  useEffect(() => {
    if (!config.stockConfig) return
    fetch(`/api/stock-projection/${departmentSlug}?date=${lockedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setStockProjection(data.items)
      })
      .catch(() => {})
  }, [config.stockConfig, departmentSlug, lockedDate])

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-ziwa-100 flex items-center justify-center mx-auto">
          <span className="text-3xl text-ziwa-600">&#10003;</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report submitted</h2>
        <p className="text-sm text-gray-500">
          Your {config.name} report has been saved successfully.
        </p>
        <div className="flex flex-col gap-3 items-center mt-6">
          {lastReportId && (
            <Link
              href={`/report/${departmentSlug}/view/${lastReportId}`}
              className="text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
            >
              View this report
            </Link>
          )}
          {lastReportId && (
            <Link
              href={`/report/${departmentSlug}/edit/${lastReportId}`}
              className="text-sm text-amber-600 font-medium hover:text-amber-700 border border-amber-300 rounded-lg px-5 py-2.5 hover:bg-amber-50 transition-colors"
            >
              Edit this report
            </Link>
          )}
          <Link
            href={`/report/${departmentSlug}`}
            className="text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
          >
            Back to {config.name}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <FormRenderer
      config={config}
      departmentId={departmentId}
      draftScope={currentUserId ?? 'guest'}
      onSuccess={(reportId) => {
        setLastReportId(reportId ?? null)
        setSubmitted(true)
      }}
      lockedDate={lockedDate}
      stockProjection={stockProjection}
      initialValues={prefillData ?? undefined}
      prefillValues={prefillData ?? undefined}
      currentUserName={currentUserName ?? undefined}
    />
  )
}
