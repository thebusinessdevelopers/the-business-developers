export const dynamic = 'force-dynamic'

import AnalysisPanel from './AnalysisPanel'

export default function AnalysisPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Analysis</h1>
      <p className="text-sm text-gray-500 mb-6">
        AI-generated intelligence from completed reporting periods. Analyses are cached after first generation.
      </p>
      <AnalysisPanel />
    </div>
  )
}
