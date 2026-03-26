'use client'

import { useState, useEffect, useRef } from 'react'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  departmentSlug: string
  category: string
  className?: string
}

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  departmentSlug,
  category,
  className,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [filtered, setFiltered] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/item-suggestions/${departmentSlug}?category=${encodeURIComponent(category)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setSuggestions(data.items)
      })
      .catch(() => {})
  }, [departmentSlug, category])

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions.slice(0, 8))
    } else {
      const lower = value.toLowerCase()
      setFiltered(suggestions.filter((s) => s.includes(lower)).slice(0, 8))
    }
    setHighlightIndex(-1)
  }, [value, suggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectSuggestion(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  function selectSuggestion(item: string) {
    onChange(item)
    setShowDropdown(false)
  }

  if (suggestions.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowDropdown(true)
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item, idx) => (
            <li
              key={item}
              onClick={() => selectSuggestion(item)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                idx === highlightIndex ? 'bg-ziwa-50 text-ziwa-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
