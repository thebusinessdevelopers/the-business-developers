'use client'

import { useConnectivity } from '@/hooks/useConnectivity'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'

export default function ConnectivityBanner() {
  const { isOnline } = useConnectivity()
  const { pendingCount } = useSubmissionQueue()

  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-sm py-2 px-4">
        You&apos;re offline. Drafts are saved locally.
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white text-center text-sm py-2 px-4">
      {pendingCount} report{pendingCount !== 1 ? 's' : ''} pending &mdash; will submit when you&apos;re back online.
    </div>
  )
}
