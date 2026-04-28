'use client'

interface SectionProgressProps {
  currentIndex: number
  totalSections: number
  sectionTitle: string
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  submitting: boolean
}

export default function SectionProgress({
  currentIndex,
  totalSections,
  sectionTitle,
  onPrevious,
  onNext,
  isFirst,
  isLast,
  submitting,
}: SectionProgressProps) {
  const progress = ((currentIndex + 1) / totalSections) * 100

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 -mx-4 px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          Section {currentIndex + 1} of {totalSections}
        </span>
        <span className="text-xs font-semibold text-gray-700 truncate ml-2">
          {sectionTitle}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-ziwa-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-3 gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={submitting}
            className="text-sm font-semibold px-6 py-2 rounded-lg bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="text-sm font-semibold px-6 py-2 rounded-lg bg-ziwa-500 hover:bg-ziwa-600 text-white transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
