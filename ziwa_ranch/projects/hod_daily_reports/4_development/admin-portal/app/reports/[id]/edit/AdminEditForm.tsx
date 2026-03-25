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

  if (saved) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Changes saved</h2>
        <p className="text-sm text-gray-500">Admin edits have been logged.</p>
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
    <FormRenderer
      config={config}
      departmentId={departmentId}
      onSuccess={() => setSaved(true)}
      editMode
      editReportId={reportId}
      initialValues={reportData}
      initialSubmittedBy={submittedBy}
      initialReportDate={reportDate}
      editorName="Admin"
    />
  )
}
