import type { DraftData } from '@/hooks/useDraftManager'

const DRAFT_PREFIX = 'hod_draft:'
const QUEUE_KEY = 'hod_submit_queue'

export interface StoredDraft {
  data: DraftData
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
}

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

function draftKey(departmentId: string, reportDate: string): string {
  return `${DRAFT_PREFIX}${departmentId}:${reportDate}`
}

export function saveDraftLocal(departmentId: string, reportDate: string, data: DraftData): void {
  if (!isAvailable()) return
  const stored: StoredDraft = { data, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(draftKey(departmentId, reportDate), JSON.stringify(stored))
  } catch { /* quota exceeded or unavailable */ }
}

export function loadDraftLocal(departmentId: string, reportDate: string): StoredDraft | null {
  if (!isAvailable()) return null
  try {
    const raw = localStorage.getItem(draftKey(departmentId, reportDate))
    if (!raw) return null
    return JSON.parse(raw) as StoredDraft
  } catch {
    return null
  }
}

export function clearDraftLocal(departmentId: string, reportDate: string): void {
  if (!isAvailable()) return
  try {
    localStorage.removeItem(draftKey(departmentId, reportDate))
  } catch { /* ignore */ }
}

export function getSubmissionQueue(): QueuedSubmission[] {
  if (!isAvailable()) return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QueuedSubmission[]
  } catch {
    return []
  }
}

export function addToSubmissionQueue(item: Omit<QueuedSubmission, 'id' | 'queuedAt'>): void {
  if (!isAvailable()) return
  const queue = getSubmissionQueue()
  const entry: QueuedSubmission = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  }
  queue.push(entry)
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* quota exceeded */ }
}

export function removeFromSubmissionQueue(id: string): void {
  if (!isAvailable()) return
  const queue = getSubmissionQueue().filter((item) => item.id !== id)
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* ignore */ }
}

export function clearSubmissionQueue(): void {
  if (!isAvailable()) return
  try {
    localStorage.removeItem(QUEUE_KEY)
  } catch { /* ignore */ }
}
