const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-4.6'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterOptions {
  messages: OpenRouterMessage[]
  maxTokens?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  referer?: string
  title?: string
}

interface OpenRouterResponse {
  content: string
  reasoning: string | null
  usage: { prompt_tokens: number; completion_tokens: number }
}

export async function callOpenRouter(opts: OpenRouterOptions): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': opts.referer ?? 'https://hoddailyreports.netlify.app',
      'X-Title': opts.title ?? 'HOD Daily Reports',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 500,
      reasoning: { effort: opts.reasoningEffort ?? 'medium' },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${text}`)
  }

  const data = await response.json()
  const msg = data.choices?.[0]?.message

  return {
    content: msg?.content ?? '',
    reasoning: msg?.reasoning ?? null,
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0 },
  }
}
