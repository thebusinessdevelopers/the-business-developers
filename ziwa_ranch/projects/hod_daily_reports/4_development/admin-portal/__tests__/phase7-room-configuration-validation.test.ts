import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

type GuardSupabase = Parameters<typeof validateAccommodationWrite>[0]

function stubSupabase(rows: { units: unknown[]; bookings?: unknown[] }) {
  return {
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      const chain = () => builder

      for (const method of ['eq', 'neq', 'lte', 'lt', 'gte', 'gt', 'in', 'order']) {
        builder[method] = chain
      }
      builder.select = chain
      builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) => {
        const data = table === 'accommodation_units' ? rows.units : rows.bookings ?? []
        resolve({ data, error: null })
      }

      return builder
    },
  } as unknown as GuardSupabase
}

const configuredUnit = {
  id: 'rhino',
  name: 'Rhino Room',
  building: 'guest_house_1',
  category: 'room',
  capacity: 4,
  max_concurrent_bookings: 1,
  rate_category: 'guest_house',
  description: null,
  pax_config: {
    max_adults: 4,
    max_children: 2,
    max_total: 4,
    cot_eligible: false,
    beds: [{ type: 'double', count: 2 }],
    stay_configurations: [
      { code: 'double', label: 'Double room' },
      { code: 'twin', label: 'Twin room' },
    ],
  },
  pricing_type: 'flat',
  status: 'active',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
}

const noOptionUnit = {
  ...configuredUnit,
  id: 'eland',
  name: 'Eland Room',
  pax_config: {
    max_adults: 2,
    max_children: 1,
    max_total: 2,
    cot_eligible: false,
    beds: [{ type: 'double', count: 1 }],
  },
}

function validInput(overrides: Partial<Parameters<typeof validateAccommodationWrite>[1]> = {}) {
  return {
    checkIn: '2026-05-02',
    checkOut: '2026-05-04',
    roomIds: ['rhino'],
    adults: 2,
    children: 0,
    basketItems: [
      {
        unit_id: 'rhino',
        adults: 2,
        children: 0,
        room_configuration_code: 'double',
        room_configuration_label: 'Double room',
      },
    ],
    ...overrides,
  }
}

test('allows a configured stay option selected for the room', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(supabase, validInput())

  assert.equal(result.ok, true)
})

test('allows a configured stay option when the label is omitted', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: [
        {
          unit_id: 'rhino',
          adults: 2,
          children: 0,
          room_configuration_code: 'double',
        },
      ],
    }),
  )

  assert.equal(result.ok, true)
})

test('allows whitespace-padded configured stay option code and label', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: [
        {
          unit_id: 'rhino',
          adults: 2,
          children: 0,
          room_configuration_code: ' double ',
          room_configuration_label: ' Double room ',
        },
      ],
    }),
  )

  assert.equal(result.ok, true)
})

test('rejects a stay option that is not configured for the room', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: [
        {
          unit_id: 'rhino',
          adults: 2,
          children: 0,
          room_configuration_code: 'king',
          room_configuration_label: 'King room',
        },
      ],
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Rhino Room must use a configured room option.')
})

test('rejects a configured stay option with a stale label', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: [
        {
          unit_id: 'rhino',
          adults: 2,
          children: 0,
          room_configuration_code: 'double',
          room_configuration_label: 'Twin room',
        },
      ],
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Rhino Room must use the configured room option label.')
})

test('rejects a missing stay option when the room requires one', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: [
        {
          unit_id: 'rhino',
          adults: 2,
          children: 0,
        },
      ],
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Rhino Room requires a room option.')
})

test('rejects a configured room when basket items are absent', async () => {
  const supabase = stubSupabase({ units: [configuredUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      basketItems: undefined,
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Rhino Room requires a room option.')
})

test('rejects a configured room when no basket item matches it', async () => {
  const supabase = stubSupabase({ units: [configuredUnit, noOptionUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      roomIds: ['rhino', 'eland'],
      basketItems: [
        {
          unit_id: 'eland',
          adults: 2,
          children: 0,
        },
      ],
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Rhino Room requires a room option.')
})

test('rejects stale stay option codes for rooms without configured options', async () => {
  const supabase = stubSupabase({ units: [noOptionUnit] })

  const result = await validateAccommodationWrite(
    supabase,
    validInput({
      roomIds: ['eland'],
      basketItems: [
        {
          unit_id: 'eland',
          adults: 2,
          children: 0,
          room_configuration_code: 'double',
          room_configuration_label: 'Double room',
        },
      ],
    }),
  )

  assert.equal(result.ok, false)
  assert.equal(result.error, 'Eland Room does not support room options.')
})
