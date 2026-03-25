'use client'

interface NumberStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

export default function NumberStepper({ label, value, onChange, min = 0 }: NumberStepperProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-4 py-2.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300 disabled:opacity-40 transition-colors text-lg font-medium"
        >
          &minus;
        </button>
        <span className="w-8 text-center font-semibold text-gray-900 tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full bg-ziwa-500 flex items-center justify-center text-white hover:bg-ziwa-600 transition-colors text-lg font-medium"
        >
          +
        </button>
      </div>
    </div>
  )
}
