'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getSmartDateButtons,
  isWithinEditWindow,
  getSubmissionStatus,
  getStatusBadgeClasses,
  getStatusLabel,
  formatDateKampala,
  formatDateTimeKampala,
  getKampalaDateStr,
} from '@/lib/submission-status'
import EditCountdown from '@/components/EditCountdown'

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

interface Announcement {
  id: string
  title: string
  body: string
  priority: string
  created_at: string
}

interface DepartmentHubProps {
  departmentName: string
  departmentSlug: string
  departmentId: string
  recentReports: RecentReport[]
  announcements?: Announcement[]
}

export default function DepartmentHub({
  departmentName,
  departmentSlug,
  recentReports,
  announcements = [],
}: DepartmentHubProps) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const todayKampala = getKampalaDateStr(new Date())
  const kampalaHour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: 'numeric', hour12: false }))

  const smartButtons = useMemo(
    () => getSmartDateButtons(recentReports.map(r => ({ report_date: r.report_date, id: r.id }))),
    [recentReports]
  )

  function handleDateButton(date: string, prefill = false) {
    if (date === todayKampala && kampalaHour < 16) {
      setPendingDate(date)
      setShowWarning(true)
      return
    }
    const params = new URLSearchParams({ date })
    if (prefill) params.set('prefill', '1')
    router.push(`/report/${departmentSlug}/new?${params.toString()}`)
  }

  function confirmToday() {
    setShowWarning(false)
    if (pendingDate) router.push(`/report/${departmentSlug}/new?date=${pendingDate}`)
  }

  function switchToYesterday() {
    setShowWarning(false)
    const d = new Date(todayKampala + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    router.push(`/report/${departmentSlug}/new?date=${d.toISOString().split('T')[0]}`)
  }

  const displayReports = showAll ? recentReports : recentReports.slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{departmentName}</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a date to submit or view a report.</p>
        </div>
        <Link
          href="/account"
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md px-2 py-1 hover:bg-gray-50 transition-colors"
        >
          Account
        </Link>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a) => {
            const style =
              a.priority === 'urgent'
                ? 'border-red-300 bg-red-50 text-red-800'
                : a.priority === 'important'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
            return (
              <div key={a.id} className={`border rounded-lg px-4 py-3 ${style}`}>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-sm mt-0.5 opacity-90">{a.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Smart date buttons */}
      <div className="space-y-3">
        {smartButtons.map((btn) => {
          if (btn.hasReport) {
            return (
              <div
                key={btn.date}
                className={`rounded-xl border p-4 ${
                  btn.priority === 'primary'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateKampala(btn.date)}
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">Submitted</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/report/${departmentSlug}/view/${btn.reportId}`}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      View
                    </Link>
                    {isWithinEditWindow(btn.date) && (
                      <Link
                        href={`/report/${departmentSlug}/edit/${btn.reportId}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
                {isWithinEditWindow(btn.date) && (
                  <div className="mt-2">
                    <EditCountdown reportDate={btn.date} />
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={btn.date} className={`rounded-xl border p-4 transition-colors ${
              btn.priority === 'primary'
                ? 'border-ziwa-300 bg-ziwa-50'
                : btn.priority === 'secondary'
                ? 'border-gray-200 bg-white'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={() => handleDateButton(btn.date)}
                className="w-full text-left"
              >
                <p className={`text-sm font-semibold ${
                  btn.priority === 'primary' ? 'text-ziwa-700' : 'text-gray-700'
                }`}>
                  {btn.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateKampala(btn.date)}
                </p>
              </button>
              {recentReports.length > 0 && (
                <button
                  onClick={() => handleDateButton(btn.date, true)}
                  className="mt-2 text-xs text-ziwa-500 hover:text-ziwa-700 font-medium"
                >
                  Start from previous report
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent reports */}
      {recentReports.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Recent reports</h3>
          {displayReports.map((report) => {
            const status = getSubmissionStatus(report.submitted_at, report.report_date)
            const canEdit = isWithinEditWindow(report.report_date)
            const editCount = report.edit_history?.length ?? 0

            return (
              <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateKampala(report.report_date)}
                    </p>
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
                      <span className="text-gray-400">&mdash; &ldquo;{report.review_comments}&rdquo;</span>
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

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/report/${departmentSlug}/view/${report.id}`}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 transition-colors"
                  >
                    View
                  </Link>
                  {canEdit && (
                    <>
                      <Link
                        href={`/report/${departmentSlug}/edit/${report.id}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-md px-3 py-1 hover:bg-amber-50 transition-colors"
                      >
                        Edit
                      </Link>
                      <EditCountdown reportDate={report.report_date} />
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {recentReports.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-sm text-ziwa-600 hover:text-ziwa-700 font-medium border border-ziwa-300 rounded-lg px-5 py-2.5 hover:bg-ziwa-50 transition-colors"
            >
              Show all reports
            </button>
          )}
        </div>
      )}

      {/* Same-day warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Are you sure?</h3>
            <p className="text-sm text-gray-600">
              It&apos;s before 4:00 PM. Most HODs report for yesterday at this time.
              Would you like to report for today or yesterday?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmToday}
                className="w-full bg-ziwa-500 hover:bg-ziwa-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Report for today
              </button>
              <button
                onClick={switchToYesterday}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Report for yesterday instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
