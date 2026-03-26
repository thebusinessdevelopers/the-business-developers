'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSubmissionQueue,
  addToSubmissionQueue,
  removeFromSubmissionQueue,
  type QueuedSubmission,
} from '@/lib/local-storage'

function isNetworkError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? ''
  return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')
}

export function useSubmissionQueue(onRetrySuccess?: (item: QueuedSubmission) => void) {
  const [pendingCount, setPendingCount] = useState(0)
  const retrying = useRef(false)

  const refresh = useCallback(() => {
    setPendingCount(getSubmissionQueue().length)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const queueSubmission = useCallback((item: Omit<QueuedSubmission, 'id' | 'queuedAt'>) => {
    addToSubmissionQueue(item)
    refresh()
  }, [refresh])

  const retryPending = useCallback(async () => {
    if (retrying.current) return
    retrying.current = true

    const queue = getSubmissionQueue()
    for (const item of queue) {
      try {
        const res = await fetch('/api/submit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentId: item.departmentId,
            reportDate: item.reportDate,
            reportData: item.reportData,
            submittedBy: item.submittedBy,
            stockConfig: item.stockConfig,
          }),
        })

        if (res.ok || res.status === 409) {
          removeFromSubmissionQueue(item.id)
          onRetrySuccess?.(item)
        }
      } catch (err) {
        if (isNetworkError(err)) break
      }
    }

    retrying.current = false
    refresh()
  }, [refresh, onRetrySuccess])

  useEffect(() => {
    const handler = () => {
      setTimeout(() => retryPending(), 2000)
    }
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [retryPending])

  return { pendingCount, queueSubmission, retryPending, refresh }
}
