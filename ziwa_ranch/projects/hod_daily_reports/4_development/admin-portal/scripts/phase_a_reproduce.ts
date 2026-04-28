/**
 * Phase A reproduction harness — v2.12 recovery.
 *
 * Runs runDailyDigestGeneration() directly against the active Supabase
 * database (service-role key from .env.local) for the most recent briefDate
 * that has reports. Prints the resulting shape and lets callSubAgent's
 * console.error instrumentation surface the dominant signal.
 *
 * Invoke:
 *   node --env-file=admin-portal/.env.local --import tsx admin-portal/scripts/phase_a_reproduce.ts [briefDate]
 */

import { createClient } from '@supabase/supabase-js'
import { runDailyDigestGeneration } from '../lib/daily-digest-generation'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  let briefDate = process.argv[2]
  if (!briefDate) {
    const { data } = await supabase
      .from('hod_daily_reports')
      .select('report_date')
      .order('report_date', { ascending: false })
      .limit(1)
    briefDate = data?.[0]?.report_date
    if (!briefDate) {
      console.error('No reports found; supply briefDate as CLI arg')
      process.exit(1)
    }
  }

  console.error(`PhaseA: reproducing runDailyDigestGeneration for briefDate=${briefDate}`)
  const started = Date.now()
  const result = await runDailyDigestGeneration({ supabase, briefDate, force: true })
  const elapsedMs = Date.now() - started

  const summary = {
    elapsedMs,
    status: result.status,
    degraded: result.data?.degraded ?? false,
    degraded_reason: result.data?.degraded_reason ?? null,
    pipeline_version: result.data?.pipeline_version ?? null,
    sub_agent_models: result.data?.sub_agent_models ?? null,
    orchestrator_model: result.data?.orchestrator_model ?? null,
    report_count: result.data?.report_count ?? null,
    total_departments: result.data?.total_departments ?? null,
    digest_preview: typeof result.data?.digest === 'string' ? result.data.digest.slice(0, 200) : null,
  }
  console.log('PhaseA: result =', JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error('PhaseA: harness error:', err)
  process.exit(1)
})
