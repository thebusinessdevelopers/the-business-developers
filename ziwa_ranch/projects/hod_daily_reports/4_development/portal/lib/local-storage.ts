import type { DraftData } from '@/hooks/useDraftManager'

const DRAFT_PREFIX = 'hod_draft:'
const SESSION_STATE_PREFIX = 'hod_session_state:'
const QUEUE_KEY = 'hod_submit_queue'

export interface StoredDraft {
  data: DraftData
  updatedAt: string
}

export interface StoredSessionState<T> {
  data: T
  updatedAt: string
}

export interface QueuedSubmission {
  id: string
  departmentId: string
  reportDate: string
  reportData: Record<string, unknown>
  submittedBy: string
  stockConfig: { stockType: string; stockField: string } | null
  slug: string
  queuedAt: string
  status: 'queued' | 'retrying' | 'failed-auth' | 'failed'
  retryCount: number
  lastAttemptAt: string | null
  lastError: string | null
}

export const SUBMISSION_QUEUE_EVENT = 'hod:submission-queue-changed'
export const SUBMISSION_SUCCESS_EVENT = 'hod:submission-success'

function isAvailable(): boolean {
  try {
    const k = '__ls_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function draftKey(departmentId: string, reportDate: string, draftScope = 'shared'): string {
  return `${DRAFT_PREFIX}${draftScope}:${departmentId}:${reportDate}`
}

function sessionStateKey(key: string): string {
  return `${SESSION_STATE_PREFIX}${key}`
}

export function saveDraftLocal(
  departmentId: string,
  reportDate: string,
  data: DraftData,
  draftScope?: string
): void {
  if (!isAvailable()) return
  const stored: StoredDraft = { data, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(draftKey(departmentId, reportDate, draftScope), JSON.stringify(stored))
  } catch { /* quota exceeded or unavailable */ }
}

export function loadDraftLocal(
  departmentId: string,
  reportDate: string,
  draftScope?: string
): StoredDraft | null {
  if (!isAvailable()) return null
  try {
    const raw = localStorage.getItem(draftKey(departmentId, reportDate, draftScope))
    if (!raw) return null
    return JSON.parse(raw) as StoredDraft
  } catch {
    return null
  }
}

export function clearDraftLocal(
  departmentId: string,
  reportDate: string,
  draftScope?: string
): void {
  if (!isAvailable()) return
  try {
    localStorage.removeItem(draftKey(departmentId, reportDate, draftScope))
  } catch { /* ignore */ }
}

export function saveSessionStateLocal<T>(key: string, data: T): void {
  if (!isAvailable()) return
  const stored: StoredSessionState<T> = { data, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(sessionStateKey(key), JSON.stringify(stored))
  } catch { /* quota exceeded or unavailable */ }
}

export function loadSessionStateLocal<T>(key: string): StoredSessionState<T> | null {
  if (!isAvailable()) return null
  try {
    const raw = localStorage.getItem(sessionStateKey(key))
    if (!raw) return null
    return JSON.parse(raw) as StoredSessionState<T>
  } catch {
    return null
  }
}

export function clearSessionStateLocal(key: string): void {
  if (!isAvailable()) return
  try {
    localStorage.removeItem(sessionStateKey(key))
  } catch { /* ignore */ }
}

export function getSubmissionQueue(): QueuedSubmission[] {
  if (!isAvailable()) return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueuedSubmission[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => ({
      ...item,
      status: item.status ?? 'queued',
      retryCount: Number.isFinite(item.retryCount) ? item.retryCount : 0,
      lastAttemptAt: item.lastAttemptAt ?? null,
      lastError: item.lastError ?? null,
    }))
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedSubmission[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore quota and transient storage failures
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SUBMISSION_QUEUE_EVENT))
  }
}

export function addToSubmissionQueue(
  item: Omit<QueuedSubmission, 'id' | 'queuedAt' | 'status' | 'retryCount' | 'lastAttemptAt' | 'lastError'>
): void {
  if (!isAvailable()) return
  const queue = getSubmissionQueue()
  const entry: QueuedSubmission = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    status: 'queued',
    retryCount: 0,
    lastAttemptAt: null,
    lastError: null,
  }
  queue.push(entry)
  writeQueue(queue)
}

export function removeFromSubmissionQueue(id: string): void {
  if (!isAvailable()) return
  const queue = getSubmissionQueue().filter((item) => item.id !== id)
  writeQueue(queue)
}

export function updateSubmissionQueueItem(
  id: string,
  patch: Partial<QueuedSubmission>
): void {
  if (!isAvailable()) return
  const queue = getSubmissionQueue().map((item) => {
    if (item.id !== id) return item
    return { ...item, ...patch }
  })
  writeQueue(queue)
}

export function clearSubmissionQueue(): void {
  if (!isAvailable()) return
  writeQueue([])
}

export function pruneSubmissionQueue(maxAgeMs: number): void {
  if (!isAvailable()) return
  const now = Date.now()
  const filtered = getSubmissionQueue().filter((item) => {
    const queuedAtMs = Date.parse(item.queuedAt)
    if (Number.isNaN(queuedAtMs)) return true
    return now - queuedAtMs <= maxAgeMs
  })
  writeQueue(filtered)
}
