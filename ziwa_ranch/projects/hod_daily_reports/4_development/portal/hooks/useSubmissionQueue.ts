'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSubmissionQueue,
  addToSubmissionQueue,
  removeFromSubmissionQueue,
  updateSubmissionQueueItem,
  pruneSubmissionQueue,
  SUBMISSION_QUEUE_EVENT,
  SUBMISSION_SUCCESS_EVENT,
  type QueuedSubmission,
} from '@/lib/local-storage'

function isNetworkError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? ''
  return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')
}

export function useSubmissionQueue(onRetrySuccess?: (item: QueuedSubmission, reportId?: string) => void) {
  const [pendingCount, setPendingCount] = useState(0)
  const [retryingCount, setRetryingCount] = useState(0)
  const [failedAuthCount, setFailedAuthCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [lastFailedError, setLastFailedError] = useState<string | null>(null)
  const retrying = useRef(false)
  const STALE_QUEUE_AGE_MS = 3 * 24 * 60 * 60 * 1000

  const refresh = useCallback(() => {
    const queue = getSubmissionQueue()
    let queued = 0
    let inRetry = 0
    let authFailed = 0
    let failed = 0
    let firstError: string | null = null

    for (const item of queue) {
      if (item.status === 'retrying') {
        inRetry++
      } else if (item.status === 'failed-auth') {
        authFailed++
        if (!firstError && item.lastError) firstError = item.lastError
      } else if (item.status === 'failed') {
        failed++
        if (!firstError && item.lastError) firstError = item.lastError
      } else {
        queued++
      }
    }

    setPendingCount(queued)
    setRetryingCount(inRetry)
    setFailedAuthCount(authFailed)
    setFailedCount(failed)
    setLastFailedError(firstError)
  }, [])

  useEffect(() => {
    pruneSubmissionQueue(STALE_QUEUE_AGE_MS)
    const id = requestAnimationFrame(() => refresh())
    return () => cancelAnimationFrame(id)
  }, [refresh, STALE_QUEUE_AGE_MS])

  const retryPending = useCallback(async () => {
    if (retrying.current) return
    if (typeof window !== 'undefined' && !navigator.onLine) return
    retrying.current = true

    pruneSubmissionQueue(STALE_QUEUE_AGE_MS)
    const queue = getSubmissionQueue().filter((item) => item.status !== 'retrying')
    for (const item of queue) {
      const attemptAt = new Date().toISOString()
      updateSubmissionQueueItem(item.id, {
        status: 'retrying',
        lastAttemptAt: attemptAt,
        lastError: null,
      })
      refresh()

      try {
        const submitBody = {
          departmentId: item.departmentId,
          reportDate: item.reportDate,
          reportData: item.reportData,
          submittedBy: item.submittedBy,
          stockConfig: item.stockConfig,
        }
        let res = await fetch('/api/submit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitBody),
        })

        if (!res.ok) {
          const preview = await res.clone().json().catch(() => null) as { needsConfirmOffset?: boolean } | null
          if (preview?.needsConfirmOffset) {
            res = await fetch('/api/submit-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...submitBody, confirm_offset: true }),
            })
          }
        }

        if (res.ok || res.status === 409) {
          const body = await res.json().catch(() => null) as { reportId?: string; duplicateId?: string } | null
          const reportId = body?.reportId ?? body?.duplicateId
          removeFromSubmissionQueue(item.id)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(SUBMISSION_SUCCESS_EVENT, {
              detail: { reportId, slug: item.slug, departmentId: item.departmentId },
            }))
          }
          onRetrySuccess?.(item, reportId)
          continue
        }

        if (res.status === 401 || res.status === 403) {
          updateSubmissionQueueItem(item.id, {
            status: 'failed-auth',
            retryCount: (item.retryCount ?? 0) + 1,
            lastAttemptAt: attemptAt,
            lastError: 'Session expired. Please sign in again to retry queued reports.',
          })
          continue
        }

        const payload = await res.json().catch(() => null) as { error?: string } | null
        updateSubmissionQueueItem(item.id, {
          status: 'failed',
          retryCount: (item.retryCount ?? 0) + 1,
          lastAttemptAt: attemptAt,
          lastError: payload?.error ?? `Submit failed with status ${res.status}`,
        })
      } catch (err) {
        if (isNetworkError(err)) {
          updateSubmissionQueueItem(item.id, {
            status: 'queued',
            retryCount: (item.retryCount ?? 0) + 1,
            lastAttemptAt: attemptAt,
            lastError: 'Network unavailable. Will retry automatically.',
          })
          break
        }
        const message = (err as { message?: string })?.message ?? 'Unexpected retry failure'
        updateSubmissionQueueItem(item.id, {
          status: 'failed',
          retryCount: (item.retryCount ?? 0) + 1,
          lastAttemptAt: attemptAt,
          lastError: message,
        })
      }
    }

    retrying.current = false
    refresh()
  }, [refresh, onRetrySuccess, STALE_QUEUE_AGE_MS])

  const queueSubmission = useCallback((item: Omit<QueuedSubmission, 'id' | 'queuedAt' | 'status' | 'retryCount' | 'lastAttemptAt' | 'lastError'>) => {
    addToSubmissionQueue(item)
    refresh()
    if (typeof window !== 'undefined' && navigator.onLine) {
      setTimeout(() => { void retryPending() }, 1000)
    }
  }, [refresh, retryPending])

  useEffect(() => {
    const handler = () => {
      setTimeout(() => { void retryPending() }, 2000)
    }
    const queueChanged = () => refresh()
    const syncStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'hod_submit_queue') {
        refresh()
      }
    }

    window.addEventListener('online', handler)
    window.addEventListener(SUBMISSION_QUEUE_EVENT, queueChanged)
    window.addEventListener('storage', syncStorage)

    if (navigator.onLine) {
      setTimeout(() => { void retryPending() }, 1500)
    }
    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        void retryPending()
      }
    }, 60000)

    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener(SUBMISSION_QUEUE_EVENT, queueChanged)
      window.removeEventListener('storage', syncStorage)
      window.clearInterval(interval)
    }
  }, [retryPending, refresh])

  return {
    pendingCount,
    retryingCount,
    failedAuthCount,
    failedCount,
    lastFailedError,
    queueSubmission,
    retryPending,
    refresh,
  }
}
