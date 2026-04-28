'use client'

import { useEffect } from 'react'

export default function AccommodationError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Accommodation page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-sm text-red-600">Something went wrong loading accommodation.</p>
      <button
        onClick={reset}
        className="text-sm text-ziwa-600 hover:text-ziwa-700 border border-ziwa-300 rounded px-3 py-1.5"
      >
        Try again
      </button>
    </div>
  )
}
