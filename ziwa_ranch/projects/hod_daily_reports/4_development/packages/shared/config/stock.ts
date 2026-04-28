export const STANDARD_UNITS = [
  'kg',
  'g',
  'litres',
  'ml',
  'pieces',
  'trays',
  'packets',
  'bottles',
  'crates',
  'bags',
  'rolls',
  'boxes',
  'bunches',
  'tins',
  'sachets',
  'pairs',
  'cartons',
  'jerrycans',
  'loaves',
  'bars',
  'cups',
  'slices',
  'bundles',
] as const

export type StandardUnit = (typeof STANDARD_UNITS)[number]

/**
 * Common misspellings/aliases → correct name.
 * Case-insensitive lookup. Extend as HODs introduce new typos.
 */
export const ITEM_CORRECTIONS: Record<string, string> = {
  'claster': 'Cluster',
  'clusters': 'Cluster',
  'tomatoe': 'Tomato',
  'tomatos': 'Tomatoes',
  'tomateos': 'Tomatoes',
  'potatoe': 'Potato',
  'potatos': 'Potatoes',
  'potateos': 'Potatoes',
  'cabagge': 'Cabbage',
  'cabbadge': 'Cabbage',
  'onios': 'Onions',
  'oinons': 'Onions',
  'banannas': 'Bananas',
  'bannanas': 'Bananas',
  'pineaple': 'Pineapple',
  'pineaples': 'Pineapples',
  'suger': 'Sugar',
  'suggar': 'Sugar',
  'flower': 'Flour',
  'flr': 'Flour',
  'margrine': 'Margarine',
  'margerine': 'Margarine',
  'detergant': 'Detergent',
  'detergient': 'Detergent',
  'bleech': 'Bleach',
  'tolet': 'Toilet',
  'toliet': 'Toilet',
  'matress': 'Mattress',
  'mattrass': 'Mattress',
  'pilliow': 'Pillow',
  'pilow': 'Pillow',
  'towells': 'Towels',
  'towles': 'Towels',
}

/**
 * Normalise unit aliases to standard units.
 * e.g. "pcs" → "pieces", "ltrs" → "litres", "kgs" → "kg"
 */
export const UNIT_ALIASES: Record<string, StandardUnit> = {
  'pcs': 'pieces',
  'pc': 'pieces',
  'piece': 'pieces',
  'ltr': 'litres',
  'ltrs': 'litres',
  'litre': 'litres',
  'liter': 'litres',
  'liters': 'litres',
  'l': 'litres',
  'kgs': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'grams': 'g',
  'gram': 'g',
  'mls': 'ml',
  'bottle': 'bottles',
  'crate': 'crates',
  'bag': 'bags',
  'roll': 'rolls',
  'box': 'boxes',
  'bunch': 'bunches',
  'tin': 'tins',
  'sachet': 'sachets',
  'pair': 'pairs',
  'carton': 'cartons',
  'jerrycan': 'jerrycans',
  'jerry can': 'jerrycans',
  'packet': 'packets',
  'tray': 'trays',
  'loaf': 'loaves',
  'bar': 'bars',
  'cup': 'cups',
  'slice': 'slices',
  'bundle': 'bundles',
}

export function normaliseUnit(raw: string): StandardUnit | string {
  const trimmed = raw.trim().toLowerCase()
  return UNIT_ALIASES[trimmed] ?? trimmed
}

export function correctItemName(raw: string): string {
  const trimmed = raw.trim()
  const correction = ITEM_CORRECTIONS[trimmed.toLowerCase()]
  return correction ?? trimmed
}
