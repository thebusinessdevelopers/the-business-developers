import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldAutoRegenerateDailyDigest,
  buildDailyDigestRegenerationRequestBody,
} from '../lib/daily-digest-regeneration-policy'

test('shouldAutoRegenerateDailyDigest returns false for stale cached briefs', () => {
  const result = shouldAutoRegenerateDailyDigest({
    pending: false,
    stale: true,
    digest: 'OVERVIEW\nSome content',
    report_count: 5,
    alreadyKickedOff: false,
  })
  assert.equal(result, false)
})

test('shouldAutoRegenerateDailyDigest returns true for pending briefs with reports', () => {
  const result = shouldAutoRegenerateDailyDigest({
    pending: true,
    stale: false,
    digest: null,
    report_count: 3,
    alreadyKickedOff: false,
  })
  assert.equal(result, true)
})

test('shouldAutoRegenerateDailyDigest returns false after automatic kick-off', () => {
  const result = shouldAutoRegenerateDailyDigest({
    pending: true,
    stale: false,
    digest: null,
    report_count: 3,
    alreadyKickedOff: true,
  })
  assert.equal(result, false)
})

test('buildDailyDigestRegenerationRequestBody uses force false for automatic generation', () => {
  const body = buildDailyDigestRegenerationRequestBody({ manual: false })
  assert.equal(body.force, false)
  assert.equal('feedback' in body, false)
})

test('buildDailyDigestRegenerationRequestBody keeps force true for manual regenerate', () => {
  const body = buildDailyDigestRegenerationRequestBody({
    manual: true,
    feedback: 'Focus on stock issues',
  })
  assert.equal(body.force, true)
  assert.equal(body.feedback, 'Focus on stock issues')
})
