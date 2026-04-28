export interface AutoRegenerateInput {
  pending: boolean
  stale: boolean
  digest: string | null
  report_count: number
  alreadyKickedOff: boolean
}

/**
 * Auto-regeneration only fires for genuinely pending briefs (no cached digest yet)
 * that have reports to summarise and haven't already been kicked off this mount.
 * Stale-but-renderable cache never auto-regenerates — the user must click Regenerate.
 */
export function shouldAutoRegenerateDailyDigest(input: AutoRegenerateInput): boolean {
  if (input.alreadyKickedOff) return false
  if (input.report_count === 0) return false
  return input.pending === true
}

export function buildDailyDigestRegenerationRequestBody(
  opts: { manual: boolean; feedback?: string },
): { force: boolean; feedback?: string } {
  if (opts.manual) {
    const body: { force: boolean; feedback?: string } = { force: true }
    if (opts.feedback) body.feedback = opts.feedback
    return body
  }
  return { force: false }
}
