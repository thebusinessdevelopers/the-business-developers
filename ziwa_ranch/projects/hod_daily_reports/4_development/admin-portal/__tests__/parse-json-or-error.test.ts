import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonOrError } from '../lib/daily-digest-generation'

test('empty string → invalid_json', () => {
  const r = parseJsonOrError('') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})

test('whitespace only → invalid_json', () => {
  const r = parseJsonOrError('   \n\t  ') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})

test('plain JSON → parsed', () => {
  const r = parseJsonOrError('{"a":1}') as { a?: number }
  assert.equal(r.a, 1)
})

test('fenced JSON ```json → parsed', () => {
  const r = parseJsonOrError('```json\n{"a":2}\n```') as { a?: number }
  assert.equal(r.a, 2)
})

test('fenced JSON ``` → parsed', () => {
  const r = parseJsonOrError('```\n{"a":3}\n```') as { a?: number }
  assert.equal(r.a, 3)
})

test('prose-prefixed → invalid_json (current contract)', () => {
  const r = parseJsonOrError('Here is the JSON: {"a":4}') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})

test('prose-trailing → invalid_json (current contract)', () => {
  const r = parseJsonOrError('{"a":5} hope that helps') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})

test('<think>-wrapped → invalid_json (current contract)', () => {
  const r = parseJsonOrError('<think>reasoning</think>{"a":6}') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})

test('truncated JSON → invalid_json', () => {
  const r = parseJsonOrError('{"a":1, "b":') as { error?: string }
  assert.equal(r.error, 'invalid_json')
})
