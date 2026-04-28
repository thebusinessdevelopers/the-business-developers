/**
 * Fuzzy search and text normalisation utilities for stock item matching.
 * Used by InventoryGrid (client-side) and harvest routes (server-side).
 */

function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[''`]/g, "'")
    .replace(/mls?\b/g, 'ml')
    .replace(/ltrs?\b/g, 'l')
    .replace(/kgs?\b/g, 'kg')
    .trim()
}

export function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => {
      if (w.length === 0) return w
      const lower = w.toLowerCase()
      if (['and', 'or', 'of', 'the', 'for', 'in', 'on', 'at', 'to', 'a'].includes(lower) && w !== str.trim().split(' ')[0]) {
        return lower
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

export function similarity(a: string, b: string): number {
  const na = normalise(a)
  const nb = normalise(b)
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

export function fuzzyMatch(query: string, target: string): boolean {
  const nq = normalise(query)
  const nt = normalise(target)
  if (nt.includes(nq)) return true
  if (nq.length <= 2) return false
  return similarity(query, target) >= 0.7
}

export interface SimilarItem {
  name: string
  score: number
}

export function findSimilarItems(
  query: string,
  items: string[],
  threshold = 0.8
): SimilarItem[] {
  return items
    .map((name) => ({ name, score: similarity(query, name) }))
    .filter((r) => r.score >= threshold && normalise(r.name) !== normalise(query))
    .sort((a, b) => b.score - a.score)
}

export function findDuplicateGroups(
  items: string[],
  threshold = 0.85
): string[][] {
  const groups: string[][] = []
  const assigned = new Set<number>()

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue
    const group = [items[i]]
    assigned.add(i)

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue
      if (similarity(items[i], items[j]) >= threshold) {
        group.push(items[j])
        assigned.add(j)
      }
    }

    if (group.length > 1) groups.push(group)
  }
  return groups
}
