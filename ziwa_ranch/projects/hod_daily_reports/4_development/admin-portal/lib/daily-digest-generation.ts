import { callOpenRouter, OPENROUTER_MODEL, OPENROUTER_MODEL_FAST } from './openrouter'
import { isValidDigestText, normaliseAiText } from './analysis-reliability'
import {
  buildDailyBriefSignatureContext,
  isDailyBriefCacheFresh,
  type SupabaseLike,
} from './daily-brief-freshness'

export interface DailyDigestData {
  digest: string | null
  report_count: number
  total_departments: number
  notes_count: number
  missing_departments: string[]
  signature: string
  pipeline_version?: string
  sub_agent_models?: string[]
  orchestrator_model?: string
  degraded?: boolean
  degraded_reason?: string
  error?: string
}

export interface GenerationResult {
  status: 'generated' | 'cached' | 'no_reports'
  data?: DailyDigestData
  generatedAt?: string
}

const PIPELINE_VERSION = 'v2.12-multi-agent'
const CACHE_PRUNE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

type SubAgent = 'occupancy' | 'stock' | 'compliance' | 'action_items'

function buildDigestFallbackText(params: { reportCount: number; totalDepts: number; missingDepts: string[] }): string {
  const { reportCount, totalDepts, missingDepts } = params
  return [
    'OVERVIEW',
    `${reportCount} of ${totalDepts} departments reported today. Automated summarisation is temporarily unavailable.`,
    '',
    'HIGHLIGHTS',
    'No validated highlights are available at the moment.',
    '',
    'ACTION ITEMS',
    'No AI action items available. Please review raw reports manually.',
    '',
    'NOT YET REPORTED',
    missingDepts.length > 0 ? missingDepts.join(', ') : 'All departments reported.',
  ].join('\n')
}

function buildFeedbackPrefix(feedback: string | undefined): string {
  if (typeof feedback !== 'string') return ''
  const trimmed = feedback.trim()
  if (trimmed.length === 0) return ''
  return `[USER INSTRUCTION] ${trimmed.slice(0, 500)} [/USER INSTRUCTION]\n\n`
}

export function parseJsonOrError(raw: string): unknown {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { error: 'invalid_json', raw: cleaned.slice(0, 500) }
  }
}

const SUB_AGENT_PROMPTS: Record<SubAgent, string> = {
  occupancy: `You are the Occupancy sub-agent for a Ugandan safari ranch daily brief. Return ONLY a single JSON object (no prose, no markdown) matching this schema:
{"brief_date": string, "units_total": number, "units_occupied_brief_date": number, "arrivals_brief_date": number, "departures_brief_date": number, "guests_on_site_brief_date": number, "arrivals_next_day": number, "departures_next_day": number, "guests_on_site_next_day": number, "occupancy_pct_brief_date": number, "anomalies": [{"type": string, "detail": string}]}
Derive all counts from the input data only. Anomalies: overbookings, zero-check-ins, drastic next-day swings. Omit anomalies array entries if none.`,
  stock: `You are the Stock sub-agent for a Ugandan safari ranch daily brief. Return ONLY a single JSON object matching this schema:
{"brief_date": string, "low_stock_items": [{"item": string, "stock_type": string, "department": string, "quantity": number, "unit": string, "severity": "watch"|"critical"}], "sudden_movements": [{"item": string, "detail": string, "delta_hint": string}], "open_flags_summary": [{"flag_type": string, "detail": string}], "critical_shortages": [{"item": string, "detail": string}]}
Use the verified stock rows and open flags provided. "watch" = running low; "critical" = out or close to out. Keep lists concise (max 5 per array). No prose outside JSON.`,
  compliance: `You are the Compliance sub-agent for a Ugandan safari ranch daily brief. Return ONLY a single JSON object matching this schema:
{"brief_date": string, "reported_count": number, "active_department_total": number, "urgent_departments": [{"name": string, "submitted_by": string, "score": number}], "departments_with_notes": [{"name": string, "line": string, "urgent": boolean}], "missing_departments": [string], "compliance_notes": [{"type": "late_submission"|"none", "detail": string}]}
"line" is a one-sentence paraphrase of the department's challenges_successes. Mark urgent when urgent_flag is true. No prose outside JSON.`,
  action_items: `You are the Action Items sub-agent for a Ugandan safari ranch daily brief. Return ONLY a single JSON object matching this schema:
{"brief_date": string, "overdue_count": number, "due_this_week_count": number, "stalled_count": number, "overdue": [{"id": string, "title": string, "deadline": string, "department": string}], "due_this_week": [{"id": string, "title": string, "deadline": string}], "stalled": [{"id": string, "title": string, "reason": string}]}
Overdue = deadline before brief_date. Due this week = deadline between brief_date and brief_date+6. Stalled = updated_at older than stalled_days_threshold. No prose outside JSON.`,
}

type SubAgentCategory =
  | 'ok'
  | 'empty_content'
  | 'invalid_json'
  | 'truncated'
  | 'rate_limit'
  | 'http_error'
  | 'transport_error'

interface SubAgentOutcome {
  agent: SubAgent
  model: string
  ok: boolean
  category: SubAgentCategory
  json: unknown
  error?: string
}

export function classifySubAgentError(errorMsg: string): SubAgentCategory {
  if (/OpenRouter 429/i.test(errorMsg)) return 'rate_limit'
  if (/OpenRouter 5\d\d/i.test(errorMsg)) return 'http_error'
  if (/OpenRouter 4\d\d/i.test(errorMsg)) return 'http_error'
  return 'transport_error'
}

async function callSubAgent(agent: SubAgent, input: unknown, model: string): Promise<SubAgentOutcome> {
  try {
    const result = await callOpenRouter({
      model,
      messages: [
        { role: 'system', content: SUB_AGENT_PROMPTS[agent] },
        { role: 'user', content: JSON.stringify(input) },
      ],
      maxTokens: 2000,
      temperature: 0.1,
      responseFormat: 'json_object',
      excludeReasoning: true,
      referer: 'https://hod-admin-portal.netlify.app',
      title: `HOD Daily Brief - ${agent}`,
    })
    const contentStr = typeof result?.content === 'string'
      ? result.content
      : JSON.stringify(result?.content ?? '')
    const parsed = parseJsonOrError(result.content)
    const isError = parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>) && (parsed as Record<string, unknown>).error === 'invalid_json'
    let category: SubAgentCategory = 'ok'
    if (isError) {
      if (contentStr.length === 0) category = 'empty_content'
      else if (result?.finishReason === 'length') category = 'truncated'
      else category = 'invalid_json'
      console.error('daily-digest-subagent:', {
        agent,
        model,
        contentType: typeof result?.content,
        contentLen: contentStr.length,
        reasoningLen: (result?.reasoning ?? '').length,
        finishReason: result?.finishReason ?? null,
        first200: contentStr.slice(0, 200),
        errorName: null,
        errorMsgFirst200: null,
        category,
      })
    }
    return { agent, model, ok: !isError, category, json: parsed, error: isError ? category : undefined }
  } catch (err) {
    const errObj = err as { name?: string; message?: string } | null
    const msg = err instanceof Error ? err.message : String(err)
    const category = classifySubAgentError(msg)
    console.error('daily-digest-subagent:', {
      agent,
      model,
      contentType: null,
      contentLen: 0,
      reasoningLen: 0,
      finishReason: null,
      first200: '',
      errorName: errObj?.name ?? null,
      errorMsgFirst200: (errObj?.message ?? String(err ?? '')).slice(0, 200),
      category,
    })
    return {
      agent,
      model,
      ok: false,
      category,
      json: { error: 'sub_agent_failed', agent, detail: msg.slice(0, 200) },
      error: msg.slice(0, 200),
    }
  }
}

export async function runDailyDigestGeneration(params: {
  supabase: SupabaseLike
  briefDate: string
  feedback?: string
  force?: boolean
}): Promise<GenerationResult> {
  const { supabase, briefDate, feedback, force } = params
  const signatureContext = await buildDailyBriefSignatureContext({ supabase, briefDate })
  const {
    reportRows,
    reports,
    historicalFlags,
    totalDepts,
    missingDepts,
    occupancyInput,
    stockInput,
    complianceInput,
    actionItemsInput,
    signature,
  } = signatureContext

  if (reportRows.length === 0 || reports.length === 0) {
    return { status: 'no_reports' }
  }

  if (!force) {
    const { data: cached } = await supabase
      .from('hod_analysis_cache')
      .select('analysis_data, generated_at')
      .eq('period_type', 'daily_brief')
      .eq('period_key', briefDate)
      .maybeSingle()

    const cachedData = cached?.analysis_data as Record<string, unknown> | null
    if (cached && isDailyBriefCacheFresh({
      cachedSignature: cachedData?.signature as string | undefined,
      currentSignature: signature,
      generatedAt: cached.generated_at as string | null,
    })) {
      return {
        status: 'cached',
        data: cachedData as unknown as DailyDigestData,
        generatedAt: cached.generated_at as string,
      }
    }
  }

  const subAgentSettled = await Promise.allSettled([
    callSubAgent('occupancy', occupancyInput, OPENROUTER_MODEL_FAST),
    callSubAgent('stock', stockInput, OPENROUTER_MODEL_FAST),
    callSubAgent('compliance', complianceInput, OPENROUTER_MODEL_FAST),
    callSubAgent('action_items', actionItemsInput, OPENROUTER_MODEL_FAST),
  ])

  const subAgentOutcomes: SubAgentOutcome[] = subAgentSettled.map((s, idx) => {
    const agent: SubAgent = (['occupancy', 'stock', 'compliance', 'action_items'] as const)[idx]
    if (s.status === 'fulfilled') return s.value
    const msg = s.reason instanceof Error ? s.reason.message : String(s.reason)
    return {
      agent,
      model: OPENROUTER_MODEL_FAST,
      ok: false,
      category: classifySubAgentError(msg),
      json: { error: 'sub_agent_rejected', agent, detail: msg.slice(0, 200) },
      error: msg.slice(0, 200),
    }
  })

  const subAgentFailures = subAgentOutcomes.filter((o) => !o.ok)
  const subAgentModels = Array.from(new Set(subAgentOutcomes.map((o) => o.model)))

  const todayUrgentCount = reports.filter((r) => {
    const flags = r.ai_flags as { top_label?: string; top_score?: number } | null
    return flags?.top_label === 'urgent issue' && (flags?.top_score ?? 0) >= 0.4
  }).length

  const historicalUrgentCount = historicalFlags.filter((r) => {
    const flags = r.ai_flags as { top_label?: string; top_score?: number } | null
    return flags?.top_label === 'urgent issue' && (flags?.top_score ?? 0) >= 0.4
  }).length
  const avgWeeklyUrgent = Math.round((historicalUrgentCount / 4) * 10) / 10

  const orchestratorHeader = {
    brief_date: briefDate,
    departments_reported_n: reports.length,
    departments_total_n: totalDepts,
    missing_departments: missingDepts,
    kampala_generated_at: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' }),
    urgency_calibration: {
      today_urgent_count: todayUrgentCount,
      four_week_weekly_average: avgWeeklyUrgent,
    },
  }

  const outcomeByAgent = new Map(subAgentOutcomes.map((o) => [o.agent, o]))
  const orchestratorUserContent = [
    `HEADER:\n${JSON.stringify(orchestratorHeader, null, 2)}`,
    `\nSUB-AGENT OUTPUTS (JSON):`,
    `\nOCCUPANCY:\n${JSON.stringify(outcomeByAgent.get('occupancy')?.json ?? {}, null, 2)}`,
    `\nSTOCK:\n${JSON.stringify(outcomeByAgent.get('stock')?.json ?? {}, null, 2)}`,
    `\nCOMPLIANCE:\n${JSON.stringify(outcomeByAgent.get('compliance')?.json ?? {}, null, 2)}`,
    `\nACTION ITEMS:\n${JSON.stringify(outcomeByAgent.get('action_items')?.json ?? {}, null, 2)}`,
  ].join('\n')

  const feedbackPrefix = buildFeedbackPrefix(feedback)

  const orchestratorSystem = `You are an executive briefing assistant at Ziwa Rhino And Wildlife Ranch in Uganda. You produce a structured daily brief for the Chairman, CEO, and General Manager.

Write in simple, clear British English. Structure your output exactly as follows, with each section on its own line:

OVERVIEW
One sentence: how many departments reported, the overall picture for the day.

HIGHLIGHTS
One line per department that has something notable. Format: "Department — what happened." Skip departments with nothing to report. If a department is flagged urgent, lead with that.

ACTION ITEMS
Specific items that need management attention today. If none, write "No actions required."

NOT YET REPORTED
List departments that haven't submitted today. If all have reported, write "All departments reported."

Rules: Plain text only — no markdown formatting. Be factual. Never invent content. If a department says "nothing" or "nil", they are all-clear — do not mention them in Highlights. Be efficient — no filler, no repetition.

You are given four sub-agent JSON payloads (Occupancy, Stock, Compliance, Action items). Treat them as factual inputs. Where fields appear inconsistent, prefer the raw Supabase-backed counts in the HEADER.

If the sub-agent outputs expose predictive or next-day signals (e.g. imminent stock shortages, sharp next-day occupancy swings, overdue action-item build-up), append one additional optional section:

RISKS AHEAD
Up to three short bullet-free lines, each naming a specific risk with a concrete reason. Omit this section entirely if no such signals are present.`

  let orchestratorText = ''
  let degradedOrchestrator = false
  let degradedReason: string | undefined

  try {
    const result = await callOpenRouter({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: orchestratorSystem },
        { role: 'user', content: `${feedbackPrefix}${orchestratorUserContent}` },
      ],
      maxTokens: 1500,
      referer: 'https://hod-admin-portal.netlify.app',
      title: 'HOD Daily Brief',
    })
    orchestratorText = result.content
  } catch (err) {
    degradedOrchestrator = true
    degradedReason = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  }

  const validOutput = !degradedOrchestrator && isValidDigestText(orchestratorText)
  const anySubAgentFailure = subAgentFailures.length > 0
  const degraded = degradedOrchestrator || !validOutput || anySubAgentFailure

  let digestData: DailyDigestData
  if (validOutput) {
    digestData = {
      digest: normaliseAiText(orchestratorText),
      report_count: reports.length,
      total_departments: totalDepts,
      notes_count: (outcomeByAgent.get('compliance')?.json as { departments_with_notes?: unknown[] } | undefined)?.departments_with_notes?.length ?? 0,
      missing_departments: missingDepts,
      signature,
      pipeline_version: PIPELINE_VERSION,
      sub_agent_models: subAgentModels,
      orchestrator_model: OPENROUTER_MODEL,
      ...(anySubAgentFailure
        ? {
            degraded: true,
            degraded_reason: `Sub-agents failed: ${subAgentFailures.map((f) => `${f.agent} (${f.category})`).join(', ')}`,
          }
        : {}),
    }
  } else {
    digestData = {
      digest: buildDigestFallbackText({ reportCount: reports.length, totalDepts, missingDepts }),
      report_count: reports.length,
      total_departments: totalDepts,
      notes_count: 0,
      missing_departments: missingDepts,
      signature,
      pipeline_version: PIPELINE_VERSION,
      sub_agent_models: subAgentModels,
      orchestrator_model: OPENROUTER_MODEL,
      degraded: true,
      degraded_reason: degradedReason ?? 'Orchestrator output invalid',
      error: 'Summarisation unavailable',
    }
  }

  const generatedAt = new Date().toISOString()

  const { error: cacheWriteError } = await supabase
    .from('hod_analysis_cache')
    .upsert({
      period_type: 'daily_brief',
      period_key: briefDate,
      analysis_data: digestData,
      generated_at: generatedAt,
      model_used: OPENROUTER_MODEL,
    }, { onConflict: 'period_type,period_key' })

  if (cacheWriteError) {
    throw new Error(`Daily digest cache write failed: ${cacheWriteError.message}`)
  }

  try {
    const { error: pruneError } = await supabase
      .from('hod_analysis_cache')
      .delete()
      .eq('period_type', 'daily_brief')
      .neq('period_key', briefDate)
      .lt('generated_at', new Date(Date.now() - CACHE_PRUNE_WINDOW_MS).toISOString())
    if (pruneError) {
      console.error('Daily digest cache prune failed (non-blocking):', pruneError.message.slice(0, 200))
    }
  } catch (cacheErr) {
    const cacheMsg = cacheErr instanceof Error ? cacheErr.message : String(cacheErr)
    console.error('Daily digest cache prune failed (non-blocking):', cacheMsg.slice(0, 200))
  }

  void degraded

  return { status: 'generated', data: digestData, generatedAt }
}
