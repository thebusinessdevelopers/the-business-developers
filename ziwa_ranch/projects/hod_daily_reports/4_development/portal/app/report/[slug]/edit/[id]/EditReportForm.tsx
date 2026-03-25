'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'

interface EditReportFormProps {
  config: DepartmentFormConfig
  departmentId: string
  reportId: string
  reportData: Record<string, unknown>
  submittedBy: string
  reportDate: string
  slug: string
}

export default function EditReportForm({
  config,
  departmentId,
  reportId,
  reportData,
  submittedBy,
  reportDate,
  slug,
}: EditReportFormProps) {
  const [saved, setSaved] = useState(false)

  if (saved) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Changes saved</h2>
        <p className="text-sm text-gray-500">Your edits have been recorded.</p>
        <div className="flex flex-col gap-3 items-center mt-6">
          <Link
            href={`/report/${slug}`}
            className="text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
          >
            Back to {config.name}
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Back to departments</Link>
        </div>
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
      editorName={submittedBy}
    />
  )
}
