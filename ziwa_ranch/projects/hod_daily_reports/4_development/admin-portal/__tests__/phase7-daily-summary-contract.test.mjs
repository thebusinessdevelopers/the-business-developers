import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const devRoot = join(__dirname, '..', '..')

function readDevSource(...parts) {
  return readFileSync(join(devRoot, ...parts), 'utf8')
}

test('HOD daily summary route exists and is limited to authenticated Head Office users', () => {
  const routePath = join(devRoot, 'portal', 'app', 'api', 'accommodation', 'daily-summary', 'route.ts')

  assert.equal(existsSync(routePath), true, 'HOD Daily Summary route is missing')

  const route = readFileSync(routePath, 'utf8')
  assert.match(route, /withAuth/)
  assert.match(route, /department_slug\s*!==\s*['"]head-office['"]/)
  assert.match(route, /status:\s*403/)
  assert.match(route, /NextResponse\.json\([^)]*\{\s*error:\s*['"]Not authenticated['"]/s)
  assert.match(route, /status:\s*401/)
  assert.match(route, /return NextResponse\.json\(\{\s*date,/s)
})

test('admin and HOD daily summary routes select booking room configuration and shared-capacity metadata', () => {
  const adminRoute = readDevSource('admin-portal', 'app', 'api', 'accommodation', 'daily-summary', 'route.ts')
  const hodRoute = readDevSource('portal', 'app', 'api', 'accommodation', 'daily-summary', 'route.ts')

  assert.match(adminRoute, /booking_rooms\(unit_id,\s*room_config,\s*accommodation_units/)
  assert.match(hodRoute, /booking_rooms\(unit_id,\s*room_config,\s*accommodation_units/)
  assert.match(adminRoute, /max_concurrent_bookings/)
  assert.match(hodRoute, /max_concurrent_bookings/)
})

test('admin Daily Summary uses shared capacity metadata and explicit legacy pax markers', () => {
  const summary = readDevSource('admin-portal', 'app', 'accommodation', 'DailySummary.tsx')

  assert.match(summary, /max_concurrent_bookings\?:\s*number\s*\|\s*null/)
  assert.match(summary, /\(unit\.max_concurrent_bookings\s*\?\?\s*1\)\s*>\s*1/)
})

test('admin Daily Summary uses shared WhatsApp formatting without repeating booking totals for legacy room rows', () => {
  const summary = readDevSource('admin-portal', 'app', 'accommodation', 'DailySummary.tsx')

  assert.match(summary, /@hod\/shared\/lib\/rooming-whatsapp/)
  assert.match(summary, /formatRoomingWhatsappMessage/)
  assert.match(summary, /createRoomingWhatsappRow/)
  assert.match(summary, /per-room pax not recorded/)
  assert.match(summary, /paxLabel:\s*getRoomWhatsappPaxLabel\(room\.room_config\)/)
  assert.doesNotMatch(summary, /const lines:\s*string\[\]/)
  assert.doesNotMatch(summary, /ZIWA RANCH [—-] ROOMING LIST/)
})

test('admin Daily Summary prefers room-level meal plan when booking rooms carry room configuration', () => {
  const summary = readDevSource('admin-portal', 'app', 'accommodation', 'DailySummary.tsx')

  assert.match(summary, /function\s+getRoomMealPlan\(/)
  assert.match(summary, /room\.room_config\?\.meal_plan\s*\?\?\s*booking\.meal_plan/)
  assert.match(summary, /mealPlan:\s*formatMealPlanLabel\(getRoomMealPlan\(booking,\s*room\)\)/)
  assert.match(summary, /formatMealPlanShort\(getRoomMealPlan\(b\.booking,\s*b\.room\)\)/)
})
