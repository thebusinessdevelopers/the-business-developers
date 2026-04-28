import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import {
  buildDailyBriefSignatureContext,
  isDailyBriefCacheFresh,
} from '@/lib/daily-brief-freshness'
import { runDailyDigestGeneration } from '@/lib/daily-digest-generation'

function getKampalaDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

function getYesterdayKampala(): string {
  const today = getKampalaDateStr()
  const d = new Date(today + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const authError = await verifyAdminAuth('analysis')
  if (authError) return authError

  const supabase = createServerClient()
  const briefDate = getYesterdayKampala()
  const signatureContext = await buildDailyBriefSignatureContext({ supabase, briefDate })
  const { reportRows, signature } = signatureContext

  if (!reportRows || reportRows.length === 0) {
    return NextResponse.json({ digest: null, report_count: 0, sections: [] })
  }

  const { data: cached } = await supabase
    .from('hod_analysis_cache')
    .select('analysis_data, generated_at')
    .eq('period_type', 'daily_brief')
    .eq('period_key', briefDate)
    .maybeSingle()

  if (!cached) {
    return NextResponse.json({
      digest: null,
      report_count: reportRows.length,
      pending: true,
      brief_date: briefDate,
    })
  }

  const cachedData = (cached.analysis_data ?? {}) as Record<string, unknown>
  const isFresh = isDailyBriefCacheFresh({
    cachedSignature: cachedData.signature as string | undefined,
    currentSignature: signature,
    generatedAt: cached.generated_at as string | null,
  })

  return NextResponse.json({
    ...cachedData,
    cached: true,
    generated_at: cached.generated_at,
    stale: !isFresh,
    brief_date: briefDate,
  })
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdminAuth('analysis')
  if (authError) return authError

  const raw = await request.json().catch(() => ({})) as Record<string, unknown>
  const force = Boolean(raw.force)
  const feedbackRaw = raw.feedback
  let feedback: string | undefined
  if (typeof feedbackRaw === 'string') {
    const trimmed = feedbackRaw.trim()
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'feedback must be 500 characters or fewer' }, { status: 400 })
    }
    if (trimmed.length > 0) feedback = trimmed
  } else if (feedbackRaw !== undefined && feedbackRaw !== null) {
    return NextResponse.json({ error: 'feedback must be a string' }, { status: 400 })
  }

  const briefDate = getYesterdayKampala()

  try {
    const supabase = createServerClient()
    const result = await runDailyDigestGeneration({ supabase, briefDate, force, feedback })
    return NextResponse.json({
      ...(result.data ?? { digest: null, report_count: 0 }),
      status: result.status,
      generated_at: result.generatedAt,
      cached: result.status === 'cached',
      brief_date: briefDate,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'Failed to regenerate daily brief', detail: msg.slice(0, 200) },
      { status: 500 }
    )
  }
}
