'use client'

interface CalculationHintProps {
  label: string
  suggestedValue: number | string
  onAccept: () => void
  visible: boolean
}

export default function CalculationHint({ label, suggestedValue, onAccept, visible }: CalculationHintProps) {
  if (!visible) return null

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-blue-600">
        {label}: <span className="font-medium">{suggestedValue}</span>
      </span>
      <button
        type="button"
        onClick={onAccept}
        className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-100 transition-colors"
      >
        Accept
      </button>
    </div>
  )
}
