'use client'

import { useState, useEffect } from 'react'
import { getEditTimeRemaining } from '@/lib/submission-status'

interface EditCountdownProps {
  reportDate: string
}

export default function EditCountdown({ reportDate }: EditCountdownProps) {
  const [remaining, setRemaining] = useState(() => getEditTimeRemaining(reportDate))

  useEffect(() => {
    const update = () => setRemaining(getEditTimeRemaining(reportDate))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [reportDate])

  if (!remaining) return null

  return (
    <span className="text-xs text-gray-500">
      Edit closes in {remaining.hours}h {remaining.minutes}m
    </span>
  )
}
