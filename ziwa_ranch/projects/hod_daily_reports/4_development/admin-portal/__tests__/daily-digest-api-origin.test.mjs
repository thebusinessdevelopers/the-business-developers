import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

test('daily digest API regenerates directly instead of enqueueing a background function', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'api', 'daily-digest', 'handler.ts'), 'utf8')
  const route = readFileSync(join(__dirname, '..', 'app', 'api', 'daily-digest', 'route.ts'), 'utf8')
  const generation = readFileSync(join(__dirname, '..', 'lib', 'daily-digest-generation.ts'), 'utf8')

  assert.match(source, /runDailyDigestGeneration/)
  assert.doesNotMatch(source, /daily-digest-background/)
  assert.doesNotMatch(source, /buildInternalHeaders/)
  assert.match(route, /export\s+\{\s*GET,\s*POST\s*\}\s+from\s+['"]\.\/handler['"]/)
  assert.match(generation, /cacheWriteError/)
  assert.match(generation, /throw new Error\(`Daily digest cache write failed:/)
})
