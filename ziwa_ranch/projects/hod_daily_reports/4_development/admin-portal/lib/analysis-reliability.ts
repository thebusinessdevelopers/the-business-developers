export interface SignatureRow {
  id: string
  edited_at: string | null
  submitted_at: string | null
}

export interface TrendInsight {
  department: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'alert'
  category: 'stock' | 'visitors' | 'compliance' | 'operations' | 'financial' | 'staffing'
}

const MIN_AI_TEXT_LENGTH = 40
const ANALYSIS_HEADERS = ['SUMMARY', 'BY DEPARTMENT', 'ISSUES', 'ACTIONS', 'PATTERNS', 'CROSS-DEPARTMENT']
const DIGEST_HEADERS = ['OVERVIEW', 'HIGHLIGHTS', 'ACTION ITEMS', 'NOT YET REPORTED']
const TREND_SEVERITIES = new Set(['info', 'warning', 'alert'])
const TREND_CATEGORIES = new Set(['stock', 'visitors', 'compliance', 'operations', 'financial', 'staffing'])

function hasMinimumStructure(content: string, headers: string[], minHits: number): boolean {
  const upper = content.toUpperCase()
  const headerHits = headers.reduce((count, header) => count + (upper.includes(header) ? 1 : 0), 0)
  return headerHits >= minHits
}

export function buildReportSignature(rows: SignatureRow[]): string {
  return rows
    .map((row) => `${row.id}:${row.edited_at ?? row.submitted_at ?? ''}`)
    .sort()
    .join('|')
}

export function normaliseAiText(content: string): string {
  return content.replace(/\r\n/g, '\n').trim()
}

export function isValidAnalysisText(content: string): boolean {
  const text = normaliseAiText(content)
  if (text.length < MIN_AI_TEXT_LENGTH) return false
  return hasMinimumStructure(text, ANALYSIS_HEADERS, 2)
}

export function isValidDigestText(content: string): boolean {
  const text = normaliseAiText(content)
  if (text.length < MIN_AI_TEXT_LENGTH) return false
  return hasMinimumStructure(text, DIGEST_HEADERS, 2)
}

export function parseTrendInsights(content: string): TrendInsight[] | null {
  const cleaned = normaliseAiText(content).replace(/```json\n?|\n?```/g, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  if (!Array.isArray(parsed)) return null

  const validated: TrendInsight[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const obj = entry as Record<string, unknown>
    const department = String(obj.department ?? '').trim()
    const title = String(obj.title ?? '').trim()
    const detail = String(obj.detail ?? '').trim()
    const severity = String(obj.severity ?? '').trim().toLowerCase()
    const category = String(obj.category ?? '').trim().toLowerCase()

    if (!department || !title || !detail) continue
    if (!TREND_SEVERITIES.has(severity)) continue
    if (!TREND_CATEGORIES.has(category)) continue

    validated.push({
      department,
      title,
      detail,
      severity: severity as TrendInsight['severity'],
      category: category as TrendInsight['category'],
    })
  }

  return validated.slice(0, 8)
}
