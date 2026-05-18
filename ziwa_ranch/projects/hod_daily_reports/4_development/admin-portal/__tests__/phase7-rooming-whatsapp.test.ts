import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRoomingWhatsappRow,
  formatRoomingWhatsappMessage,
  type RoomingWhatsappInput,
} from '@hod/shared/lib/rooming-whatsapp'

test('formats occupied rooming rows for WhatsApp without UI or clipboard concerns', () => {
  const input: RoomingWhatsappInput = {
    date: '2026-05-17',
    rows: [
      createRoomingWhatsappRow({
        roomName: 'Rhino Room',
        guestName: 'Amina Okello',
        adults: 2,
        children: 0,
        roomConfigurationLabel: 'Twin room',
        mealPlan: 'Full board',
        stayNight: '1 of 2',
        status: 'confirmed',
        notes: '',
      }),
      createRoomingWhatsappRow({
        roomName: 'Eland Room',
        guestName: 'Peter Kato',
        adults: 2,
        children: 1,
        roomConfigurationLabel: 'Double room',
        mealPlan: 'Bed and breakfast',
        stayNight: 'arrival night',
        status: 'pending housekeeping',
        notes: 'Cot requested',
      }),
    ],
  }

  assert.equal(
    formatRoomingWhatsappMessage(input),
    [
      '*17 MAY 2026 - ZIWA ROOMING*',
      '',
      '1. Rhino Room - Amina Okello | Pax: 2 adults, 0 children | Room configuration: Twin room | Meal plan: Full board | Stay night: 1 of 2 | Status: confirmed | Notes: no notes',
      '2. Eland Room - Peter Kato | Pax: 2 adults, 1 child | Room configuration: Double room | Meal plan: Bed and breakfast | Stay night: arrival night | Status: pending housekeeping | Notes: Cot requested',
    ].join('\n'),
  )
})

test('normalises blank notes when formatting rows directly', () => {
  assert.equal(
    formatRoomingWhatsappMessage({
      date: '2026-05-17',
      rows: [
        {
          roomName: 'Shoebill Room',
          guestName: 'Direct Row Guest',
          adults: 1,
          children: 1,
          roomConfigurationLabel: 'Family room',
          mealPlan: 'Half board',
          stayNight: '2 of 3',
          status: 'checked in',
          notes: '   ',
        },
      ],
    }),
    [
      '*17 MAY 2026 - ZIWA ROOMING*',
      '',
      '1. Shoebill Room - Direct Row Guest | Pax: 1 adult, 1 child | Room configuration: Family room | Meal plan: Half board | Stay night: 2 of 3 | Status: checked in | Notes: no notes',
    ].join('\n'),
  )
})

test('uses explicit pax label when per-room pax was not recorded', () => {
  assert.equal(
    formatRoomingWhatsappMessage({
      date: '2026-05-17',
      rows: [
        createRoomingWhatsappRow({
          roomName: 'Legacy Room',
          guestName: 'Legacy Guest',
          adults: 0,
          children: 0,
          paxLabel: 'per-room pax not recorded',
          roomConfigurationLabel: 'per-room pax not recorded',
          mealPlan: 'Full board',
          stayNight: '1 of 1',
          status: 'confirmed',
          notes: null,
        }),
      ],
    }),
    [
      '*17 MAY 2026 - ZIWA ROOMING*',
      '',
      '1. Legacy Room - Legacy Guest | Pax: per-room pax not recorded | Room configuration: per-room pax not recorded | Meal plan: Full board | Stay night: 1 of 1 | Status: confirmed | Notes: no notes',
    ].join('\n'),
  )
})
