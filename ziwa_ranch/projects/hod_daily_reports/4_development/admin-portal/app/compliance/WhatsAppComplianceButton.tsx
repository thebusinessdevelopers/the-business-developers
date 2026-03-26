'use client'

import { useState } from 'react'

interface DeptStat {
  name: string
  submitted: number
  missed: number
  rate: number
  total: number
}

interface WhatsAppComplianceButtonProps {
  stats: DeptStat[]
  days: number
  reportingDays: number
  fromDate: string
  toDate: string
  totalSubmitted: number
  totalExpected: number
  overallRate: number
}

export default function WhatsAppComplianceButton({
  stats,
  days,
  reportingDays,
  fromDate,
  toDate,
  totalSubmitted,
  totalExpected,
  overallRate,
}: WhatsAppComplianceButtonProps) {
  const [copied, setCopied] = useState(false)

  function generateMessage(): string {
    const lines: string[] = [
      '*HOD Daily Reports — Compliance Summary*',
      `${fromDate} – ${toDate} (${days} days, ${reportingDays} reporting days)`,
      '',
    ]

    const sorted = [...stats].sort((a, b) => b.rate - a.rate)

    for (const dept of sorted) {
      let line = `${dept.name}: ${dept.submitted}/${dept.total} (${dept.rate}%)`
      if (dept.missed > 0) {
        line += ` — ${dept.missed} missed`
      }
      lines.push(line)
    }

    lines.push('')
    lines.push(`*Overall: ${totalSubmitted}/${totalExpected} (${overallRate}%)*`)

    return lines.join('\n')
  }

  async function handleCopy() {
    const message = generateMessage()
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = message
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs font-medium rounded-md px-3 py-1.5 transition-colors border ${
        copied
          ? 'bg-green-50 text-green-700 border-green-300'
          : 'text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {copied ? 'Copied!' : 'Copy WhatsApp message'}
    </button>
  )
}
