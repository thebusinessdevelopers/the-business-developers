import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const handlerSource = readFileSync(new URL('../app/api/daily-digest/handler.ts', import.meta.url), 'utf8')
const generationSource = readFileSync(new URL('../lib/daily-digest-generation.ts', import.meta.url), 'utf8')

test('daily digest GET uses shared composite freshness helper', () => {
  assert.match(handlerSource, /daily-brief-freshness/, 'GET handler should import the shared freshness helper')
  assert.match(handlerSource, /buildDailyBriefSignatureContext/, 'GET handler should build the composite signature context')
  assert.match(handlerSource, /isDailyBriefCacheFresh/, 'GET handler should use the shared two-hour freshness check')
  assert.doesNotMatch(handlerSource, /buildReportSignature/, 'GET handler must not compare report-only signatures')
  assert.match(generationSource, /daily-brief-freshness/, 'generation should share the same signature helper')
})
