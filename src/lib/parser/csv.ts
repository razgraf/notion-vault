import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { getMarkdownPath } from '../config'

export interface CsvData {
  headers: string[]
  rows: Record<string, string>[]
}

export interface CsvPair {
  filtered: CsvData
  all: CsvData
}

export function parseCsvFile(filePath: string): CsvData | null {
  const basePath = getMarkdownPath()
  const fullPath = path.join(basePath, filePath)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    console.error('CSV parse errors:', result.errors)
  }

  const headers = result.meta.fields || []
  const rows = result.data

  return { headers, rows }
}

export function getCsvPair(csvPath: string): CsvPair | null {
  const basePath = getMarkdownPath()

  // Remove _all suffix if present to get base path
  const cleanPath = csvPath.replace(/_all\.csv$/, '.csv')
  const allPath = cleanPath.replace(/\.csv$/, '_all.csv')

  const filteredFullPath = path.join(basePath, cleanPath)
  const allFullPath = path.join(basePath, allPath)

  const hasFiltered = fs.existsSync(filteredFullPath)
  const hasAll = fs.existsSync(allFullPath)

  if (!hasFiltered && !hasAll) {
    return null
  }

  const filtered = hasFiltered ? parseCsvFile(cleanPath) : null
  const all = hasAll ? parseCsvFile(allPath) : null

  // If one is missing, use the other for both
  return {
    filtered: filtered || all!,
    all: all || filtered!,
  }
}

export function findCsvByUuid(uuid: string): string | null {
  const basePath = getMarkdownPath()
  const shortUuid = uuid.slice(0, 8)
  const fullUuid = uuid.replace(/-/g, '')

  function searchDir(dir: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const found = searchDir(entryPath)
        if (found) return found
      } else if (entry.name.endsWith('.csv') && !entry.name.endsWith('_all.csv')) {
        const nameWithoutExt = entry.name.replace('.csv', '')
        if (
          nameWithoutExt.includes(fullUuid) ||
          nameWithoutExt.toLowerCase().includes(shortUuid)
        ) {
          return path.relative(basePath, entryPath)
        }
      }
    }

    return null
  }

  return searchDir(basePath)
}
