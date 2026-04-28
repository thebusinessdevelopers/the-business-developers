export const AREAS = [
  'Rwanyanya',
  'Lugogo',
  'Wangoiro',
  'Mikerenge',
  'Kamira',
  'Kasozi',
  'Karakwende',
] as const

export const ZONES = [
  'R1', 'R2', 'R3',
  'L1', 'L2', 'L3',
  'W1', 'W2', 'W3',
  'M1', 'M2', 'M3',
  'K1', 'K2', 'K3',
] as const

export const GATES = [
  'Main Gate',
  'Kyamukama Gate',
  'Kamira Gate',
  'Sajjabi 1 Gate',
  'Sajjabi 2 Gate',
  'Wangoiro West Gate',
  'Mandela Gate',
  'Wangoiro East Gate',
  'Lugogo West Gate',
  "Captain's Gate",
  'Kasozi Outpost Gate',
] as const

export type Area = (typeof AREAS)[number]
export type Zone = (typeof ZONES)[number]
export type Gate = (typeof GATES)[number]
