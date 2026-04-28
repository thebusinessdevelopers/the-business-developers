'use client'

import { requestSessionFlush } from '@hod/shared/lib/session-flush'

interface EndClientSessionOptions {
  source: string
  reason?: string
  redirectTo?: string
}

export async function endClientSession({
  source,
  reason,
  redirectTo = '/login',
}: EndClientSessionOptions): Promise<void> {
  await requestSessionFlush()

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, reason }),
    })

    const data = await response.json().catch(() => null) as
      | { redirectTo?: string }
      | null

    if (typeof data?.redirectTo === 'string' && data.redirectTo) {
      redirectTo = data.redirectTo
    }
  } catch {
    // Best effort: still clear the local session by redirecting.
  }

  window.location.href = redirectTo
}
