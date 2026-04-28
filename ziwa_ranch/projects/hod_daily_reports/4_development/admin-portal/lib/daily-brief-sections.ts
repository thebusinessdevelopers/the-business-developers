const SECTION_HEADERS = [
  'OVERVIEW',
  'HIGHLIGHTS',
  'ACTION ITEMS',
  'NOT YET REPORTED',
  'RISKS AHEAD',
] as const

export function parseDigestSections(text: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  const lines = text.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if ((SECTION_HEADERS as readonly string[]).includes(trimmed)) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
      }
      currentTitle = trimmed
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ title: 'SUMMARY', body: text.trim() })
  }

  return sections
}
