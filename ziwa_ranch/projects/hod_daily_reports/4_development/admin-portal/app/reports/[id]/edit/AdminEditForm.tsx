'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'

interface AdminEditFormProps {
  config: DepartmentFormConfig
  departmentId: string
  reportId: string
  reportData: Record<string, unknown>
  submittedBy: string
  reportDate: string
}

export default function AdminEditForm({
  config,
  departmentId,
  reportId,
  reportData,
  submittedBy,
  reportDate,
}: AdminEditFormProps) {
  const [saved, setSaved] = useState(false)
  const [newDate, setNewDate] = useState(reportDate)
  const [dateError, setDateError] = useState<string | null>(null)
  const [dateSaving, setDateSaving] = useState(false)

  async function handleSuccess() {
    if (newDate !== reportDate) {
      setDateSaving(true)
      setDateError(null)
      try {
        const res = await fetch('/api/change-report-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, newDate }),
        })
        const data = await res.json()
        if (!res.ok) {
          setDateError(data.error || 'Failed to change date')
          setDateSaving(false)
          return
        }
      } catch {
        setDateError('Failed to change date. Please try again.')
        setDateSaving(false)
        return
      }
      setDateSaving(false)
    }
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Changes saved</h2>
        <p className="text-sm text-gray-500">
          Admin edits have been logged.
          {newDate !== reportDate && ` Report date changed to ${newDate}.`}
        </p>
        <Link
          href={`/reports/${reportId}`}
          className="inline-block mt-4 text-sm text-ziwa-600 font-medium hover:text-ziwa-700"
        >
          Back to report &rarr;
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Report date</label>
        <input
          type="date"
          value={newDate}
          onChange={(e) => { setNewDate(e.target.value); setDateError(null) }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
        />
        {newDate !== reportDate && (
          <p className="text-xs text-amber-600 mt-1.5">
            Date will be changed from {reportDate} to {newDate} when you save.
          </p>
        )}
        {dateError && <p className="text-xs text-red-600 mt-1.5">{dateError}</p>}
        {dateSaving && <p className="text-xs text-gray-500 mt-1.5">Saving date change...</p>}
      </div>

      <FormRenderer
        config={config}
        departmentId={departmentId}
        onSuccess={handleSuccess}
        editMode
        editReportId={reportId}
        initialValues={reportData}
        initialSubmittedBy={submittedBy}
        initialReportDate={reportDate}
        editorName="Admin"
      />
    </div>
  )
}
