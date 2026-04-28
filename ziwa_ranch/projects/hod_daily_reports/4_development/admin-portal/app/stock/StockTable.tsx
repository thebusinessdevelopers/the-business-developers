'use client'

import { useState, useRef, useEffect } from 'react'
import { STANDARD_UNITS } from '@hod/shared/config/stock'

interface StockItem {
  item: string
  quantity: number
  unit: string
}

interface StockTableProps {
  entryId: string
  items: StockItem[]
}

type EditingCell = { idx: number; field: 'item' | 'quantity' | 'unit' } | null

export default function StockTable({ entryId, items: initialItems }: StockTableProps) {
  const [items, setItems] = useState(initialItems)
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [editValue, setEditValue] = useState<string | number>('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingCell])

  function startEdit(idx: number, field: 'item' | 'quantity' | 'unit') {
    setEditingCell({ idx, field })
    setEditValue(items[idx][field])
    setMessage(null)
  }

  async function commitEdit() {
    if (!editingCell) return
    const { idx, field } = editingCell
    const newValue = field === 'quantity' ? (parseFloat(String(editValue)) || 0) : String(editValue).trim()

    if (newValue === items[idx][field] || (field !== 'quantity' && !newValue)) {
      setEditingCell(null)
      return
    }

    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: newValue } : item
    )

    setSaving(true)
    try {
      const res = await fetch('/api/stock/edit-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, items: updated }),
      })
      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Save failed' })
        return
      }
      setItems(updated)
      setMessage({ type: 'success', text: 'Saved' })
      setTimeout(() => setMessage(null), 1500)
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
      setEditingCell(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-2 text-gray-600 font-medium">Item</th>
              <th className="pb-2 text-gray-600 font-medium text-right w-24">Qty</th>
              <th className="pb-2 text-gray-600 font-medium text-right w-28">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1.5">
                  {editingCell?.idx === idx && editingCell.field === 'item' ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={editValue as string}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      disabled={saving}
                      className="w-full border border-ziwa-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ziwa-400"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(idx, 'item')}
                      className="w-full text-left text-gray-900 hover:text-ziwa-600 hover:bg-ziwa-50 rounded px-1 py-0.5 -mx-1 transition-colors"
                    >
                      {item.item}
                    </button>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {editingCell?.idx === idx && editingCell.field === 'quantity' ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="number"
                      value={editValue as number}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      disabled={saving}
                      className="w-20 border border-ziwa-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-ziwa-400"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(idx, 'quantity')}
                      className="text-right font-medium text-gray-900 hover:text-ziwa-600 hover:bg-ziwa-50 rounded px-1 py-0.5 transition-colors"
                    >
                      {item.quantity}
                    </button>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {editingCell?.idx === idx && editingCell.field === 'unit' ? (
                    <select
                      ref={inputRef as React.RefObject<HTMLSelectElement>}
                      value={editValue as string}
                      onChange={(e) => { setEditValue(e.target.value); }}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      disabled={saving}
                      className="w-28 border border-ziwa-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ziwa-400 bg-white"
                    >
                      <option value="">—</option>
                      {STANDARD_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(idx, 'unit')}
                      className="text-right text-gray-500 hover:text-ziwa-600 hover:bg-ziwa-50 rounded px-1 py-0.5 transition-colors"
                    >
                      {item.unit || '—'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <p className={`text-xs mt-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
