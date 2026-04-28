export const SESSION_EXPIRING_EVENT = 'hod:session-expiring'

export interface SessionFlushRequestDetail {
  waitUntil: (work: Promise<void> | void) => void
}

function settle(work: Promise<void> | void): Promise<void> {
  return Promise.resolve(work).then(() => undefined).catch(() => undefined)
}

export function addSessionFlushListener(
  flusher: () => Promise<void> | void
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<SessionFlushRequestDetail>).detail
    if (!detail?.waitUntil) return
    detail.waitUntil(settle(flusher()))
  }

  window.addEventListener(SESSION_EXPIRING_EVENT, handler as EventListener)
  return () => {
    window.removeEventListener(SESSION_EXPIRING_EVENT, handler as EventListener)
  }
}

export async function requestSessionFlush(timeoutMs = 2000): Promise<void> {
  if (typeof window === 'undefined') return

  const pending: Promise<void>[] = []
  const detail: SessionFlushRequestDetail = {
    waitUntil(work) {
      pending.push(settle(work))
    },
  }

  window.dispatchEvent(
    new CustomEvent<SessionFlushRequestDetail>(SESSION_EXPIRING_EVENT, { detail })
  )

  if (pending.length === 0) return

  await Promise.race([
    Promise.allSettled(pending).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs)
    }),
  ])
}
