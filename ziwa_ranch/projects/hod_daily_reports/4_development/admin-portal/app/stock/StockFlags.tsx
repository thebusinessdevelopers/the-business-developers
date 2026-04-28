'use client'

import { useState } from 'react'

interface StockFlag {
  id: string
  flag_type: string
  item_names: string[]
  suggested_canonical: string | null
  status: string
  department_name: string
  created_at: string
}

interface StockFlagsProps {
  flags: StockFlag[]
}

export default function StockFlags({ flags: initialFlags }: StockFlagsProps) {
  const [flags, setFlags] = useState(initialFlags)
  const [scanning, setScanning] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editedNames, setEditedNames] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(true)

  const [scanResult, setScanResult] = useState<string | null>(null)

  async function runScan() {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/stock/scan-duplicates', { method: 'POST' })
      const data = await res.json()
      if (data.flagsCreated > 0) {
        window.location.reload()
      } else {
        setScanResult('No new duplicates found.')
      }
    } catch {
      setScanResult('Scan failed. Try again.')
    } finally {
      setScanning(false)
    }
  }

  async function handleMerge(flag: StockFlag) {
    if (!flag.suggested_canonical) return
    setActionLoading(flag.id)
    try {
      const res = await fetch('/api/stock/merge-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId: flag.id,
          canonicalName: (editedNames[flag.id] ?? flag.suggested_canonical)?.trim() || flag.suggested_canonical,
          duplicateNames: flag.item_names,
        }),
      })
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flag.id))
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleIgnore(flagId: string) {
    setActionLoading(flagId)
    try {
      const res = await fetch('/api/stock/resolve-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, action: 'ignored', notes: 'Dismissed by admin' }),
      })
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const openFlags = flags.filter((f) => f.status === 'open')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Quality</h2>
            <p className="text-sm text-gray-500 mt-0.5">Potential duplicate items across stock departments.</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={runScan}
            disabled={scanning}
            className="text-xs font-medium text-indigo-700 border border-indigo-300 rounded-md px-3 py-1.5 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : 'Scan for duplicates'}
          </button>
          {scanResult && <span className="text-xs text-gray-500">{scanResult}</span>}
        </div>
      </div>

      {!expanded ? null : openFlags.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No open flags. Run a scan to check for duplicates.</p>
      ) : (
        <div className="space-y-3">
          {openFlags.map((flag) => (
            <div key={flag.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-amber-700 uppercase">{flag.flag_type}</span>
                  <span className="text-xs text-gray-400 ml-2">{flag.department_name}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(flag.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {flag.item_names.map((name) => (
                  <span
                    key={name}
                    className={`inline-block text-xs rounded px-2 py-0.5 ${
                      name === flag.suggested_canonical
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>

              {flag.suggested_canonical && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 shrink-0">Merge into:</span>
                  <input
                    type="text"
                    value={editedNames[flag.id] ?? flag.suggested_canonical}
                    onChange={(e) => setEditedNames(prev => ({ ...prev, [flag.id]: e.target.value }))}
                    className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 min-w-0 focus:ring-1 focus:ring-green-400 focus:border-green-400"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleMerge(flag)}
                  disabled={actionLoading === flag.id}
                  className="text-xs font-medium text-green-700 border border-green-300 rounded px-2.5 py-1 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  {actionLoading === flag.id ? 'Merging…' : 'Merge'}
                </button>
                <button
                  onClick={() => handleIgnore(flag.id)}
                  disabled={actionLoading === flag.id}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
