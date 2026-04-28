import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { callOpenRouter } from '@hod/shared/lib/openrouter'

const origFetch = globalThis.fetch
const origKey = process.env.OPENROUTER_API_KEY

function stubFetch(body: unknown, opts: { status?: number } = {}) {
  const status = opts.status ?? 200
  globalThis.fetch = (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
})
afterEach(() => {
  globalThis.fetch = origFetch
  process.env.OPENROUTER_API_KEY = origKey
})

test('string content returned verbatim', async () => {
  stubFetch({ choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }], usage: {} })
  const r = await callOpenRouter({ messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(r.content, '{"a":1}')
  assert.equal(r.finishReason, 'stop')
})

test('missing content → empty string', async () => {
  stubFetch({ choices: [{ message: {}, finish_reason: 'stop' }], usage: {} })
  const r = await callOpenRouter({ messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(r.content, '')
})

test('finish_reason: length → surfaced as finishReason', async () => {
  stubFetch({ choices: [{ message: { content: '' }, finish_reason: 'length' }], usage: {} })
  const r = await callOpenRouter({ messages: [{ role: 'user', content: 'hi' }] })
  assert.equal(r.finishReason, 'length')
})

test('non-OK 429 → throws with status', async () => {
  stubFetch('Rate limit exceeded', { status: 429 })
  await assert.rejects(
    () => callOpenRouter({ messages: [{ role: 'user', content: 'hi' }] }),
    /OpenRouter 429/,
  )
})

test('non-OK 503 → throws with status', async () => {
  stubFetch('upstream unavailable', { status: 503 })
  await assert.rejects(
    () => callOpenRouter({ messages: [{ role: 'user', content: 'hi' }] }),
    /OpenRouter 503/,
  )
})

test('title with em-dash (U+2014) does NOT throw pre-flight ByteString TypeError', async () => {
  // Locks in H5 regression: non-ASCII header must be sanitised before fetch.
  stubFetch({ choices: [{ message: { content: 'ok' } }], usage: {} })
  const r = await callOpenRouter({
    messages: [{ role: 'user', content: 'hi' }],
    title: 'HOD Daily Brief — occupancy',
  })
  assert.equal(r.content, 'ok')
})

test('referer with non-ASCII does NOT throw pre-flight', async () => {
  stubFetch({ choices: [{ message: { content: 'ok' } }], usage: {} })
  const r = await callOpenRouter({
    messages: [{ role: 'user', content: 'hi' }],
    referer: 'https://example.com/— path',
  })
  assert.equal(r.content, 'ok')
})
