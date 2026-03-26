'use client'

import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'

interface ViewReportContentProps {
  config: DepartmentFormConfig
  departmentId: string
  reportData: Record<string, unknown>
}

export default function ViewReportContent({ config, departmentId, reportData }: ViewReportContentProps) {
  return (
    <FormRenderer
      config={config}
      departmentId={departmentId}
      onSuccess={() => {}}
      initialValues={reportData}
      readOnly
    />
  )
}
