'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { fuzzyMatch, toTitleCase, findSimilarItems, type SimilarItem } from '@hod/shared/lib/fuzzy-search'
import { STANDARD_UNITS, correctItemName, normaliseUnit } from '@hod/shared/config/stock'

interface InventoryItem {
  name: string
  unit: string | null
  cost_per_unit: number | null
  occurrence_count: number
}

interface PreviousValue {
  quantity: number
  unit: string
  cost_per_unit?: number
}

interface ActiveItem {
  item: string
  quantity: number | ''
  unit: string
  cost_per_unit: number | ''
  [key: string]: string | number | ''
}

interface ExtraFieldDef {
  name: string
  label: string
  type: 'text' | 'number'
  placeholder?: string
}

interface InventoryGridProps {
  departmentSlug: string
  category: string
  showCost: boolean
  showPrevious: boolean
  extraFields: ExtraFieldDef[]
  minItems: number
  value: ActiveItem[]
  onChange: (items: ActiveItem[]) => void
  readOnly?: boolean
}

export default function InventoryGrid({
  departmentSlug,
  category,
  showCost,
  showPrevious,
  extraFields,
  minItems,
  value,
  onChange,
  readOnly = false,
}: InventoryGridProps) {
  const [libraryItems, setLibraryItems] = useState<InventoryItem[]>([])
  const [previousQty, setPreviousQty] = useState<Record<string, PreviousValue>>({})
  const [search, setSearch] = useState('')
  const [showAddNew, setShowAddNew] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [similarSuggestions, setSimilarSuggestions] = useState<SimilarItem[]>([])
  const [showSimilarPopup, setShowSimilarPopup] = useState(false)

  useEffect(() => {
    const cacheKey = `inventory:${departmentSlug}:${category}`
    const CACHE_TTL = 30 * 60 * 1000

    const applyCached = () => {
      try {
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const { data, ts } = JSON.parse(raw)
          if (Date.now() - ts < CACHE_TTL && data.items) {
            setLibraryItems(data.items)
            if (data.previousQuantities) setPreviousQty(data.previousQuantities)
            setLoaded(true)
          }
        }
      } catch { /* ignore corrupt cache */ }
    }
    requestAnimationFrame(applyCached)

    fetch(`/api/inventory-items/${departmentSlug}?category=${encodeURIComponent(category)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setLibraryItems(data.items)
        if (data.previousQuantities) setPreviousQty(data.previousQuantities)
        setLoaded(true)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
        } catch { /* quota exceeded */ }
      })
      .catch(() => setLoaded(true))
  }, [departmentSlug, category])

  const activeMap = useMemo(() => {
    const map = new Map<string, number>()
    value.forEach((v, i) => {
      if (v.item) map.set(v.item.toLowerCase(), i)
    })
    return map
  }, [value])

  const allItems = useMemo(() => {
    const fromLibrary = libraryItems.map((li) => ({
      name: li.name,
      unit: li.unit ?? '',
      cost_per_unit: li.cost_per_unit,
      fromLibrary: true,
    }))

    const extraFromValue = value
      .filter((v) => v.item && !libraryItems.some((li) => li.name.toLowerCase() === v.item.toLowerCase()))
      .map((v) => ({
        name: v.item,
        unit: v.unit || '',
        cost_per_unit: typeof v.cost_per_unit === 'number' ? v.cost_per_unit : null,
        fromLibrary: false,
      }))

    return [...fromLibrary, ...extraFromValue]
  }, [libraryItems, value])

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems
    return allItems.filter((i) => fuzzyMatch(search, i.name))
  }, [allItems, search])

  const activeCount = value.filter((v) => v.item && (typeof v.quantity === 'number' && v.quantity > 0)).length
  const totalCount = allItems.length

  function toggleItem(itemName: string, defaultUnit: string, defaultCost: number | null) {
    if (readOnly) return
    const key = itemName.toLowerCase()
    const idx = activeMap.get(key)

    if (idx !== undefined) {
      const updated = value.filter((_, i) => i !== idx)
      onChange(updated)
    } else {
      const prev = previousQty[key]
      const rawUnit = defaultUnit || prev?.unit || ''
      const newEntry: ActiveItem = {
        item: itemName,
        quantity: '',
        unit: normaliseUnit(rawUnit) || rawUnit,
        cost_per_unit: defaultCost ?? prev?.cost_per_unit ?? '',
      }
      for (const ef of extraFields) {
        newEntry[ef.name] = ''
      }
      onChange([...value, newEntry])
    }
  }

  function updateField(itemKey: string, field: string, val: string | number) {
    if (readOnly) return
    const idx = activeMap.get(itemKey)
    if (idx === undefined) return
    const updated = [...value]
    updated[idx] = { ...updated[idx], [field]: val }
    onChange(updated)
  }

  function incrementQty(itemKey: string, delta: number) {
    if (readOnly) return
    const idx = activeMap.get(itemKey)
    if (idx === undefined) return
    const current = typeof value[idx].quantity === 'number' ? value[idx].quantity as number : 0
    const next = Math.max(0, current + delta)
    const updated = [...value]
    updated[idx] = { ...updated[idx], quantity: next }
    onChange(updated)
  }

  const checkSimilarity = useCallback((name: string) => {
    const existingNames = allItems.map((i) => i.name)
    const similar = findSimilarItems(name, existingNames)
    setSimilarSuggestions(similar)
    return similar.length > 0
  }, [allItems])

  function normaliseName(raw: string): string {
    return toTitleCase(correctItemName(raw))
  }

  function confirmAddItem(name: string) {
    const normalised = normaliseName(name)
    if (activeMap.has(normalised.toLowerCase())) {
      setNewItemName('')
      setShowAddNew(false)
      setShowSimilarPopup(false)
      setSimilarSuggestions([])
      return
    }

    const newEntry: ActiveItem = {
      item: normalised,
      quantity: '',
      unit: '',
      cost_per_unit: '',
    }
    for (const ef of extraFields) {
      newEntry[ef.name] = ''
    }
    onChange([...value, newEntry])
    setNewItemName('')
    setShowAddNew(false)
    setShowSimilarPopup(false)
    setSimilarSuggestions([])
  }

  function addNewItem() {
    if (!newItemName.trim() || readOnly) return
    const name = newItemName.trim()
    if (activeMap.has(name.toLowerCase())) {
      setNewItemName('')
      setShowAddNew(false)
      return
    }
    if (checkSimilarity(name)) {
      setShowSimilarPopup(true)
      return
    }
    confirmAddItem(name)
  }

  const runningTotal = showCost
    ? value.reduce((sum, v) => {
        const qty = typeof v.quantity === 'number' ? v.quantity : 0
        const cost = typeof v.cost_per_unit === 'number' ? v.cost_per_unit : 0
        return sum + qty * cost
      }, 0)
    : 0

  if (readOnly) {
    const activeItems = value.filter((v) => v.item && (typeof v.quantity === 'number' && v.quantity > 0))
    if (activeItems.length === 0) return <p className="text-sm text-gray-400 italic">No items recorded.</p>

    return (
      <div className="space-y-2">
        {activeItems.map((v) => (
          <div key={v.item} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-900 font-medium">{v.item}</span>
            <span className="text-sm text-gray-600">
              {v.quantity} {v.unit}
              {showCost && typeof v.cost_per_unit === 'number' && v.cost_per_unit > 0 && (
                <span className="text-gray-400 ml-2">
                  @ {Number(v.cost_per_unit).toLocaleString()} = {((typeof v.quantity === 'number' ? v.quantity : 0) * v.cost_per_unit).toLocaleString()} UGX
                </span>
              )}
            </span>
          </div>
        ))}
        {showCost && runningTotal > 0 && (
          <p className="text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
            Total: {runningTotal.toLocaleString()} UGX
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      {totalCount > 8 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
        />
      )}

      {/* Progress indicator */}
      {totalCount > 0 && (
        <p className="text-xs text-gray-500">
          {activeCount} of {totalCount} items selected
        </p>
      )}

      {/* Item grid */}
      {!loaded ? (
        <p className="text-sm text-gray-400">Loading items...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((item) => {
            const key = item.name.toLowerCase()
            const idx = activeMap.get(key)
            const isActive = idx !== undefined
            const activeData = isActive ? value[idx] : null
            const prev = showPrevious ? previousQty[key] : undefined

            return (
              <div
                key={item.name}
                className={`rounded-xl border p-3 transition-colors ${
                  isActive
                    ? 'border-ziwa-300 bg-ziwa-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {isActive ? (
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.name, item.unit, item.cost_per_unit)}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-ziwa-700 truncate">{item.name}</p>
                    </button>
                    {value.length > minItems && (
                      <button
                        type="button"
                        onClick={() => toggleItem(item.name, item.unit, item.cost_per_unit)}
                        className="shrink-0 w-7 h-7 rounded-md bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                        aria-label={`Remove ${item.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleItem(item.name, item.unit, item.cost_per_unit)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium text-gray-700">{item.name}</p>
                    {prev && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Last: {prev.quantity} {prev.unit}
                      </p>
                    )}
                    {item.unit && !prev && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
                    )}
                  </button>
                )}

                {isActive && activeData && (
                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {/* Quantity stepper */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => incrementQty(key, -1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-lg"
                      >
                        &minus;
                      </button>
                      <input
                        type="number"
                        value={activeData.quantity}
                        onChange={(e) => updateField(key, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent"
                        min={0}
                      />
                      <button
                        type="button"
                        onClick={() => incrementQty(key, 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit */}
                    <select
                      value={activeData.unit}
                      onChange={(e) => updateField(key, 'unit', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ziwa-500 bg-white"
                    >
                      <option value="">Select unit</option>
                      {STANDARD_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    {/* Cost */}
                    {showCost && (
                      <input
                        type="number"
                        value={activeData.cost_per_unit}
                        onChange={(e) => updateField(key, 'cost_per_unit', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Cost/unit (UGX)"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ziwa-500"
                      />
                    )}

                    {/* Line total hint */}
                    {showCost && typeof activeData.quantity === 'number' && typeof activeData.cost_per_unit === 'number' && activeData.quantity > 0 && activeData.cost_per_unit > 0 && (
                      <p className="text-xs text-blue-600">
                        = {(activeData.quantity * activeData.cost_per_unit).toLocaleString()} UGX
                      </p>
                    )}

                    {/* Previous value hint */}
                    {prev && (
                      <p className="text-xs text-gray-400">Last: {prev.quantity} {prev.unit}</p>
                    )}

                    {/* Extra fields */}
                    {extraFields.map((ef) => (
                      <input
                        key={ef.name}
                        type={ef.type}
                        value={String(activeData[ef.name] ?? '')}
                        onChange={(e) => updateField(key, ef.name, ef.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                        placeholder={ef.placeholder || ef.label}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ziwa-500"
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Running total */}
      {showCost && runningTotal > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-sm font-semibold text-blue-800">
            Running total: {runningTotal.toLocaleString()} UGX
          </p>
        </div>
      )}

      {/* Add new item */}
      {showAddNew ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value)
                setShowSimilarPopup(false)
                setSimilarSuggestions([])
              }}
              placeholder="New item name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addNewItem()}
            />
            <button
              type="button"
              onClick={addNewItem}
              disabled={!newItemName.trim()}
              className="bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-medium px-3 py-1.5 rounded-md text-sm transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowAddNew(false); setNewItemName(''); setShowSimilarPopup(false); setSimilarSuggestions([]) }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>

          {showSimilarPopup && similarSuggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">Did you mean one of these?</p>
              <div className="space-y-1">
                {similarSuggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      toggleItem(s.name, allItems.find((i) => i.name === s.name)?.unit ?? '', allItems.find((i) => i.name === s.name)?.cost_per_unit ?? null)
                      setShowSimilarPopup(false)
                      setSimilarSuggestions([])
                      setNewItemName('')
                      setShowAddNew(false)
                    }}
                    className="block w-full text-left text-sm text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                  >
                    {s.name} <span className="text-xs text-amber-500">({Math.round(s.score * 100)}% match)</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => confirmAddItem(newItemName)}
                className="text-xs text-gray-500 hover:text-gray-700 mt-1"
              >
                No, add &ldquo;{toTitleCase(newItemName)}&rdquo; as new item
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddNew(true)}
          className="inline-flex items-center gap-1.5 text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors"
        >
          <span>+</span> Add new item
        </button>
      )}
    </div>
  )
}

export type { ActiveItem, ExtraFieldDef }
