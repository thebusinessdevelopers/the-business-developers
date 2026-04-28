const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'
export const OPENROUTER_MODEL = MODEL
export const OPENROUTER_MODEL_FAST = process.env.OPENROUTER_MODEL_FAST ?? 'google/gemini-2.5-flash'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterOptions {
  messages: OpenRouterMessage[]
  maxTokens?: number
  temperature?: number
  referer?: string
  title?: string
  tools?: OpenRouterTool[]
  model?: string
  responseFormat?: 'json_object'
  excludeReasoning?: boolean
}

interface OpenRouterTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface OpenRouterResponse {
  content: string
  reasoning: string | null
  finishReason?: string
  usage: { prompt_tokens: number; completion_tokens: number }
  tool_calls?: { function: { name: string; arguments: string } }[]
}

function toAsciiHeader(value: string): string {
  // fetch requires header values to be ByteStrings (Latin-1). Replace any
  // character outside that range — em-dash, smart quotes, emoji, etc. — with
  // '-' so the request never throws a TypeError before being sent.
  return value.replace(/[^\x00-\xFF]/g, '-')
}

export async function callOpenRouter(opts: OpenRouterOptions): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': toAsciiHeader(opts.referer ?? 'https://hoddailyreports.netlify.app'),
      'X-Title': toAsciiHeader(opts.title ?? 'HOD Daily Reports'),
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 500,
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts.tools && { tools: opts.tools }),
      ...(opts.responseFormat === 'json_object' && { response_format: { type: 'json_object' } }),
      ...(opts.excludeReasoning && { reasoning: { exclude: true } }),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${text}`)
  }

  const data = await response.json()
  const msg = data.choices?.[0]?.message
  const finishReason = data.choices?.[0]?.finish_reason

  return {
    content: msg?.content ?? '',
    reasoning: msg?.reasoning ?? null,
    finishReason: typeof finishReason === 'string' ? finishReason : undefined,
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0 },
    tool_calls: msg?.tool_calls ?? undefined,
  }
}
