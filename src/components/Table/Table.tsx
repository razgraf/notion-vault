'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CsvData {
  headers: string[]
  rows: Record<string, string>[]
}

interface ChildNode {
  title: string
  slug: string
}

interface TableProps {
  filtered: CsvData
  all: CsvData
  defaultVariant?: 'filtered' | 'all'
  linkedPages?: ChildNode[]
  propertyColors?: Record<string, string>
}

const NOTION_COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  default: { bg: 'bg-neutral-500/20', text: 'text-neutral-300' },
  gray: { bg: 'bg-neutral-500/20', text: 'text-neutral-300' },
  brown: { bg: 'bg-amber-900/30', text: 'text-amber-300' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  green: { bg: 'bg-green-500/20', text: 'text-green-300' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  red: { bg: 'bg-red-500/20', text: 'text-red-300' },
}

function ColorBadge({ value, color }: { value: string; color?: string }) {
  const colorClasses = color ? NOTION_COLOR_CLASSES[color] || NOTION_COLOR_CLASSES.default : null

  if (!colorClasses) {
    return <span>{value}</span>
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}>
      {value}
    </span>
  )
}

function CellValue({ value, propertyColors }: { value: string; propertyColors?: Record<string, string> }) {
  if (!propertyColors || !value) {
    return <>{value || ''}</>
  }

  // Check if this value has a color assigned
  const color = propertyColors[value]
  if (color) {
    return <ColorBadge value={value} color={color} />
  }

  // Check if this is a comma-separated list (multi-select)
  if (value.includes(',')) {
    const parts = value.split(',').map((v) => v.trim())
    const hasColors = parts.some((p) => propertyColors[p])

    if (hasColors) {
      return (
        <div className="flex flex-wrap gap-1">
          {parts.map((part, idx) => (
            <ColorBadge key={idx} value={part} color={propertyColors[part]} />
          ))}
        </div>
      )
    }
  }

  return <>{value}</>
}

export function Table({ filtered, all, defaultVariant = 'all', linkedPages = [], propertyColors }: TableProps) {
  const [variant, setVariant] = useState<'filtered' | 'all'>(defaultVariant)
  const data = variant === 'filtered' ? filtered : all

  const hasMultipleVariants =
    JSON.stringify(filtered) !== JSON.stringify(all)

  const hasLinkedPages = linkedPages.length > 0

  // Build a map of normalized titles to slugs for quick lookup
  const titleToSlug = new Map<string, string>()
  for (const page of linkedPages) {
    titleToSlug.set(normalizeTitle(page.title), page.slug)
  }

  function normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace special characters with space
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim()
  }

  function findSlugForRow(row: Record<string, string>): string | null {
    // Try "Name" column first, then "Title"
    const nameValue = row['Name'] || row['Title'] || row['name'] || row['title']
    if (!nameValue) return null
    return titleToSlug.get(normalizeTitle(nameValue)) || null
  }

  return (
    <div className="my-4">
      {hasMultipleVariants && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          <span className="text-text-secondary">View:</span>
          <button
            onClick={() => setVariant('filtered')}
            className={`px-2 py-1 rounded transition-colors ${
              variant === 'filtered'
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            Filtered ({filtered.rows.length})
          </button>
          <button
            onClick={() => setVariant('all')}
            className={`px-2 py-1 rounded transition-colors ${
              variant === 'all'
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            All ({all.rows.length})
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full">
          <thead>
            <tr>
              {data.headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left text-sm font-semibold text-text-primary bg-bg-secondary border-b border-border"
                >
                  {header}
                </th>
              ))}
              {hasLinkedPages && (
                <th className="px-3 py-2 w-14 bg-bg-secondary border-b border-border" />
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => {
              const slug = findSlugForRow(row)
              return (
                <tr
                  key={rowIndex}
                  className="hover:bg-hover transition-colors"
                >
                  {data.headers.map((header) => (
                    <td
                      key={header}
                      className="px-3 py-2 text-sm text-text-primary border-b border-border"
                    >
                      <CellValue value={row[header] || ''} propertyColors={propertyColors} />
                    </td>
                  ))}
                  {hasLinkedPages && (
                    <td className="px-3 py-2 border-b border-border">
                      {slug && (
                        <Link
                          href={`/page/${slug}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded bg-bg-tertiary hover:bg-accent text-text-secondary hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data.rows.length === 0 && (
        <p className="text-center text-text-secondary py-8">No data</p>
      )}
    </div>
  )
}
