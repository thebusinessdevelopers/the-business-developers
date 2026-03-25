'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DepartmentFormConfig } from '@/types'
import FormRenderer from '@/components/FormRenderer'
import { isWithinEditWindow, formatDateTimeKampala, getSubmissionStatus, getStatusBadgeClasses, getStatusLabel } from '@/lib/submission-status'

interface ReportFormProps {
  config: DepartmentFormConfig
  departmentId: string
  departmentSlug: string
}

interface ProjectionItem {
  item: string
  quantity: number
  unit: string
}

interface RecentReport {
  id: string
  report_date: string
  submitted_by: string
  submitted_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  review_comments: string | null
  edited_at: string | null
  edit_history: unknown[] | null
}

function getTodayKampala(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

function getNextDeadline(): string {
  const now = new Date()
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: 'numeric', hour12: false }))
  const today = getTodayKampala()

  if (hour < 12) {
    return `${today} at 12:00`
  }
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
  return `${tomorrowStr} at 12:00`
}

export default function ReportForm({ config, departmentId, departmentSlug }: ReportFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [lastReportId, setLastReportId] = useState<string | null>(null)
  const [stockProjection, setStockProjection] = useState<ProjectionItem[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [recentReports, setRecentReports] = useState<RecentReport[] | null>(null)
  const [todaySubmitted, setTodaySubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = getTodayKampala()
  const hasStockConfig = !!config.stockConfig

  useEffect(() => {
    async function fetchRecent() {
      try {
        const { supabase } = await import('@/lib/supabase')
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const minDate = threeDaysAgo.toISOString().split('T')[0]

        const { data } = await supabase
          .from('hod_daily_reports')
          .select('id, report_date, submitted_by, submitted_at, acknowledged_at, acknowledged_by, review_comments, edited_at, edit_history')
          .eq('department_id', departmentId)
          .gte('report_date', minDate)
          .order('report_date', { ascending: false })
          .limit(5)

        const reports = (data ?? []) as RecentReport[]
        setRecentReports(reports)
        setTodaySubmitted(reports.some((r) => r.report_date === today))
      } catch {
        setRecentReports([])
      } finally {
        setLoading(false)
      }
    }
    fetchRecent()
  }, [departmentId, today])

  useEffect(() => {
    if (!hasStockConfig) return
    fetch(`/api/stock-projection/${departmentSlug}?date=${today}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setStockProjection(data.items)
      })
      .catch(() => {})
  }, [hasStockConfig, departmentSlug, today])

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-ziwa-100 flex items-center justify-center mx-auto">
          <span className="text-3xl text-ziwa-600">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report submitted</h2>
        <p className="text-sm text-gray-500">
          Your {config.name} report has been saved successfully.
        </p>
        <div className="flex flex-col gap-3 items-center mt-6">
          {lastReportId && (
            <Link
              href={`/report/${departmentSlug}/edit/${lastReportId}`}
              className="text-sm text-amber-600 font-medium hover:text-amber-700 border border-amber-300 rounded-lg px-5 py-2.5 hover:bg-amber-50 transition-colors"
            >
              Edit this report
            </Link>
          )}
          <button
            onClick={() => { setSubmitted(false); setLastReportId(null); setShowForm(false) }}
            className="text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
          >
            Submit another report
          </button>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Back to departments
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (todaySubmitted && !showForm) {
    return (
      <div className="space-y-8">
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <h2 className="text-lg font-bold text-green-900">All reports due submitted</h2>
          <p className="text-sm text-green-700">
            Next report due: {getNextDeadline()}
          </p>
        </div>

        {recentReports && recentReports.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Recent reports</h3>
            {recentReports.map((report) => {
              const status = getSubmissionStatus(report.submitted_at, report.report_date)
              const canEdit = isWithinEditWindow(report.report_date)
              const editCount = report.edit_history?.length ?? 0

              return (
                <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.report_date}</p>
                      <p className="text-xs text-gray-500">
                        by {report.submitted_by} &middot; {formatDateTimeKampala(report.submitted_at)}
                      </p>
                    </div>
                    <span className={`text-xs border rounded px-2 py-0.5 ${getStatusBadgeClasses(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  {report.acknowledged_at && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Reviewed by {report.acknowledged_by}
                      {report.review_comments && (
                        <span className="text-gray-400">— &ldquo;{report.review_comments}&rdquo;</span>
                      )}
                    </div>
                  )}

                  {!report.acknowledged_at && (
                    <p className="text-xs text-gray-400">Not yet reviewed</p>
                  )}

                  {editCount > 0 && (
                    <p className="text-xs text-amber-600">
                      Edited {editCount} time{editCount > 1 ? 's' : ''}
                      {report.edited_at && <> &middot; last at {formatDateTimeKampala(report.edited_at)}</>}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    {canEdit && (
                      <Link
                        href={`/report/${departmentSlug}/edit/${report.id}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-md px-3 py-1 hover:bg-amber-50 transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-ziwa-600 hover:text-ziwa-700 font-medium border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
          >
            Submit a report for a different date
          </button>
        </div>
      </div>
    )
  }

  return (
    <FormRenderer
      config={config}
      departmentId={departmentId}
      onSuccess={(reportId) => {
        setLastReportId(reportId ?? null)
        setSubmitted(true)
      }}
      stockProjection={stockProjection}
    />
  )
}
