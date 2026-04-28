'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useConnectivity } from '@/hooks/useConnectivity'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { SUBMISSION_SUCCESS_EVENT } from '@/lib/local-storage'

interface SuccessInfo {
  slug?: string
  reportId?: string
}

const SUCCESS_DISPLAY_MS = 6000

export default function ConnectivityBanner() {
  const { isOnline } = useConnectivity()
  const { pendingCount, retryingCount, failedAuthCount, failedCount, lastFailedError } = useSubmissionQueue()
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

  const handleSuccess = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as { reportId?: string; slug?: string } | undefined
    setSuccess({ slug: detail?.slug, reportId: detail?.reportId })
  }, [])

  useEffect(() => {
    window.addEventListener(SUBMISSION_SUCCESS_EVENT, handleSuccess)
    return () => window.removeEventListener(SUBMISSION_SUCCESS_EVENT, handleSuccess)
  }, [handleSuccess])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), SUCCESS_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [success])

  if (success) {
    return (
      <div className="sticky top-0 z-50 bg-green-600 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
        <span>Queued report submitted successfully.</span>
        {success.slug && success.reportId && (
          <Link
            href={`/report/${success.slug}/view/${success.reportId}`}
            className="underline font-medium hover:text-green-100"
          >
            View report
          </Link>
        )}
      </div>
    )
  }

  if (isOnline && pendingCount === 0 && retryingCount === 0 && failedAuthCount === 0 && failedCount === 0) {
    return null
  }

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-sm py-2 px-4">
        You&apos;re offline. Drafts are saved locally.
      </div>
    )
  }

  if (failedAuthCount > 0) {
    return (
      <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-sm py-2 px-4">
        <p>{failedAuthCount} queued report{failedAuthCount !== 1 ? 's' : ''} need a fresh sign-in before retry.</p>
        {lastFailedError && (
          <p className="text-xs text-red-200 mt-0.5">{lastFailedError}</p>
        )}
      </div>
    )
  }

  if (failedCount > 0) {
    return (
      <div className="sticky top-0 z-50 bg-amber-600 text-white text-center text-sm py-2 px-4">
        <p>{failedCount} queued report{failedCount !== 1 ? 's' : ''} failed to sync and will retry automatically.</p>
        {lastFailedError && (
          <p className="text-xs text-amber-200 mt-0.5">{lastFailedError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white text-center text-sm py-2 px-4">
      {retryingCount > 0
        ? `Syncing ${retryingCount} queued report${retryingCount !== 1 ? 's' : ''}...`
        : `${pendingCount} report${pendingCount !== 1 ? 's' : ''} pending — will submit automatically.`}
    </div>
  )
}
