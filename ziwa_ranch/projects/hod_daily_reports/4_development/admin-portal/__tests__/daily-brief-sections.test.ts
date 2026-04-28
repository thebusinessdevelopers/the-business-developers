import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDigestSections } from '../lib/daily-brief-sections'

const FIVE_SECTION_BRIEF = [
  'OVERVIEW',
  '3 of 16 departments reported today.',
  '',
  'HIGHLIGHTS',
  'Reception — all fine.',
  '',
  'ACTION ITEMS',
  'Stock reorder needed for kitchen supplies.',
  '',
  'NOT YET REPORTED',
  'Kitchen, Workshop, Garden',
  '',
  'RISKS AHEAD',
  'Fuel reserves are critically low and may halt generator operations by Wednesday.',
].join('\n')

const FOUR_SECTION_BRIEF = [
  'OVERVIEW',
  '5 of 16 departments reported today.',
  '',
  'HIGHLIGHTS',
  'Smooth operations across the board.',
  '',
  'ACTION ITEMS',
  'No actions required.',
  '',
  'NOT YET REPORTED',
  'Kitchen, Workshop',
].join('\n')

test('parseDigestSections returns RISKS AHEAD as its own section', () => {
  const sections = parseDigestSections(FIVE_SECTION_BRIEF)
  const titles = sections.map((s) => s.title)
  assert.ok(titles.includes('RISKS AHEAD'), `Expected RISKS AHEAD in ${JSON.stringify(titles)}`)
  assert.equal(sections.length, 5)
  const risks = sections.find((s) => s.title === 'RISKS AHEAD')!
  assert.ok(risks.body.includes('Fuel reserves'))
})

test('parseDigestSections keeps four-section briefs unchanged', () => {
  const sections = parseDigestSections(FOUR_SECTION_BRIEF)
  assert.equal(sections.length, 4)
  const titles = sections.map((s) => s.title)
  assert.deepEqual(titles, ['OVERVIEW', 'HIGHLIGHTS', 'ACTION ITEMS', 'NOT YET REPORTED'])
})

test('parseDigestSections falls back to SUMMARY when no known headers', () => {
  const plain = 'Just a plain summary with no section headers.'
  const sections = parseDigestSections(plain)
  assert.equal(sections.length, 1)
  assert.equal(sections[0].title, 'SUMMARY')
  assert.equal(sections[0].body, plain)
})
