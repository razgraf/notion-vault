'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MiniSearch from 'minisearch'

interface SearchDocument {
  id: string
  title: string
  slug: string
  content: string
  type: 'page' | 'csv'
}

interface SearchResult {
  id: string
  title: string
  slug: string
  type: 'page' | 'csv'
  score: number
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchIndex, setSearchIndex] = useState<MiniSearch<SearchDocument> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load search index on mount
  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    fetch('/api/search', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        const miniSearch = new MiniSearch<SearchDocument>({
          fields: ['title', 'content'],
          storeFields: ['title', 'slug', 'type'],
          searchOptions: {
            boost: { title: 10 },
            fuzzy: 0.2,
            prefix: true,
          },
        })
        miniSearch.addAll(data.documents)
        setSearchIndex(miniSearch)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    if (!searchIndex || !query.trim()) {
      setResults([])
      return
    }

    const searchResults = searchIndex.search(query).slice(0, 10)
    setResults(
      searchResults.map((r) => ({
        id: r.id,
        title: r.title as string,
        slug: r.slug as string,
        type: r.type as 'page' | 'csv',
        score: r.score,
      }))
    )
    setSelectedIndex(0)
  }, [query, searchIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        router.push(`/page/${results[selectedIndex].slug}`)
        onClose()
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [results, selectedIndex, router, onClose]
  )

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-bg-secondary rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <svg
            className="w-5 h-5 text-text-secondary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary outline-none text-base"
          />
          <kbd className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading search index...</div>
          ) : query && results.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">No results found</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    onClick={() => {
                      router.push(`/page/${result.slug}`)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      index === selectedIndex ? 'bg-hover' : ''
                    }`}
                  >
                    <span className="text-text-secondary">
                      {result.type === 'csv' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate text-text-primary">{result.title}</span>
                    {index === selectedIndex && (
                      <span className="text-xs text-text-secondary">Enter to open</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-text-secondary">Type to search...</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <kbd className="bg-bg-tertiary px-1.5 py-0.5 rounded">↑</kbd>
            <kbd className="bg-bg-tertiary px-1.5 py-0.5 rounded">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-bg-tertiary px-1.5 py-0.5 rounded">Enter</kbd>
            Open
          </span>
        </div>
      </div>
    </div>
  )
}
