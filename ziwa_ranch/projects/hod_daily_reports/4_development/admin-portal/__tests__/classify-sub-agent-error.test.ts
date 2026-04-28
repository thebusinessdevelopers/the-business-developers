import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifySubAgentError } from '../lib/daily-digest-generation'

test('429 → rate_limit', () => {
  assert.equal(classifySubAgentError('OpenRouter 429: rate limit'), 'rate_limit')
})

test('503 → http_error', () => {
  assert.equal(classifySubAgentError('OpenRouter 503: upstream'), 'http_error')
})

test('502 → http_error', () => {
  assert.equal(classifySubAgentError('OpenRouter 502: bad gateway'), 'http_error')
})

test('400 → http_error', () => {
  assert.equal(classifySubAgentError('OpenRouter 400: bad request'), 'http_error')
})

test('ByteString TypeError → transport_error', () => {
  assert.equal(
    classifySubAgentError('Cannot convert argument to a ByteString because the character at index 16 has a value of 8212 which is greater than 255.'),
    'transport_error',
  )
})

test('generic error → transport_error', () => {
  assert.equal(classifySubAgentError('network unreachable'), 'transport_error')
})
