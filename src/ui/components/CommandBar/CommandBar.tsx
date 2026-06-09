import React, { useState, useEffect, useRef, useCallback } from 'react'
import { SearchResult } from '../../../types/index'
import { fuzzySearch } from '../../../core/CommandPalette/FuzzySearch'
import { commandParser } from '../../../core/CommandPalette/CommandParser'
import './CommandBar.css'

interface CommandBarProps {
  isOpen: boolean
  onClose: () => void
  onCommandExecute: (commandId: string, params?: Record<string, string>) => void
}

export default function CommandBar({ isOpen, onClose, onCommandExecute }: CommandBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    const trimmed = query.trim()
    setIsLoading(true)
    if (trimmed.length === 0) {
      setResults([])
      setSelectedIndex(0)
      setIsLoading(false)
      return
    }
    setResults(fuzzySearch.search(trimmed, 10))
    setSelectedIndex(0)
    setIsLoading(false)
  }, [query])

  const executeSelected = useCallback(() => {
    const selected = results[selectedIndex]
    if (!selected) {
      return
    }
    const parsed = commandParser.parse(query)
    const params = commandParser.extractParams(parsed.params) as Record<string, string>
    if (selected.entry.matchName) {
      params.matchName = selected.entry.matchName
    }
    params.effectName = selected.entry.label
    params.source = selected.entry.source
    onCommandExecute(selected.entry.id, params)
    onClose()
  }, [results, selectedIndex, query, onCommandExecute, onClose])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      executeSelected()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }, [results.length, executeSelected, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="astron-command-bar-overlay" onClick={onClose}>
      <div className="astron-command-bar" onClick={(e) => e.stopPropagation()}>
        <div className="astron-search-row">
          <span className="astron-search-icon">⌘</span>
          <input
            ref={inputRef}
            className="astron-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, effects, anything..."
          />
          <kbd className="astron-kbd">ESC</kbd>
        </div>
        <div className="astron-results-list">
          {isLoading && <div className="astron-no-results">Searching...</div>}
          {!isLoading && results.map((result, i) => (
            <div
              key={result.entry.id}
              className={`astron-result-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => {
                const params: Record<string, string> = {
                  effectName: result.entry.label,
                  source: result.entry.source,
                }
                if (result.entry.matchName) {
                  params.matchName = result.entry.matchName
                }
                onCommandExecute(result.entry.id, params)
                onClose()
              }}
            >
              <div className="astron-result-left">
                <span className="astron-result-label">{result.entry.label}</span>
                {result.entry.source === 'native_effect' &&
                  <span className="astron-result-meta">Native AE Effect</span>}
              </div>
              {result.entry.module &&
                <span className={`astron-result-badge astron-badge-${result.entry.module}`}>
                  {result.entry.module.toUpperCase()}
                </span>}
            </div>
          ))}
          {!isLoading && results.length === 0 && query.length > 0 &&
            <div className="astron-no-results">No results for "{query}"</div>}
        </div>
      </div>
    </div>
  )
}
