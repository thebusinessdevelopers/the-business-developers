import { EditHistoryEntry } from '@/types'

interface EditHistoryProps {
  history: EditHistoryEntry[]
}

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '(empty)'
  if (Array.isArray(val)) return `[${val.length} entries]`
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export default function EditHistory({ history }: EditHistoryProps) {
  if (!history || history.length === 0) return null

  return (
    <div className="mt-8 pt-4 border-t border-gray-100">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Edit log</p>
      <div className="space-y-1">
        {history.map((entry, idx) => (
          <div key={idx} className="text-[11px] text-gray-400 font-mono leading-relaxed">
            <span className="text-gray-500">[{formatDateTime(entry.edited_at)}]</span>{' '}
            <span>{entry.edited_by}</span>:{' '}
            {entry.changes.map((c, ci) => (
              <span key={ci}>
                {ci > 0 && ', '}
                {c.field} <span className="text-gray-300">{formatValue(c.old_value)} → {formatValue(c.new_value)}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
