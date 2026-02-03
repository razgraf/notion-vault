import MiniSearch from 'minisearch'
import { flattenTree, parseIndexHtml, type NavNode } from '../parser/index-html'
import { readMarkdownFile } from '../parser/markdown'
import { parseCsvFile } from '../parser/csv'

export interface SearchDocument {
  id: string
  title: string
  slug: string
  content: string
  type: 'page' | 'csv'
}

export interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string
  type: 'page' | 'csv'
  score: number
}

let searchIndex: MiniSearch<SearchDocument> | null = null
let documents: SearchDocument[] = []

function extractContent(node: NavNode): string {
  if (!node.filePath) return ''

  if (node.isCsv) {
    const csvData = parseCsvFile(node.filePath)
    if (!csvData) return ''
    return csvData.rows.map((row) => Object.values(row).join(' ')).join(' ')
  }

  const pageContent = readMarkdownFile(node.filePath)
  if (!pageContent) return ''

  // Strip markdown syntax for plain text search
  return pageContent.content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/---/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

export function buildSearchIndex(): void {
  const workspace = parseIndexHtml()
  const nodes = flattenTree(workspace.tree)

  documents = nodes
    .filter((node) => !node.isExternal && (node.filePath || node.children.length > 0))
    .map((node) => ({
      id: node.id,
      title: node.title,
      slug: node.slug,
      content: node.filePath ? extractContent(node) : '',
      type: node.isCsv ? 'csv' as const : 'page' as const,
    }))

  searchIndex = new MiniSearch<SearchDocument>({
    fields: ['title', 'content'],
    storeFields: ['title', 'slug', 'type'],
    searchOptions: {
      boost: { title: 10 },
      fuzzy: 0.2,
      prefix: true,
    },
  })

  searchIndex.addAll(documents)
}

export function search(query: string, limit = 20): SearchResult[] {
  if (!searchIndex) {
    buildSearchIndex()
  }

  const results = searchIndex!.search(query).slice(0, limit)

  return results.map((result) => {
    const doc = documents.find((d) => d.id === result.id)
    const excerpt = doc
      ? createExcerpt(doc.content, query)
      : ''

    return {
      id: result.id,
      title: result.title as string,
      slug: result.slug as string,
      excerpt,
      type: result.type as 'page' | 'csv',
      score: result.score,
    }
  })
}

function createExcerpt(content: string, query: string, maxLength = 150): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const queryWords = lowerQuery.split(/\s+/)

  // Find the first occurrence of any query word
  let bestIndex = -1
  for (const word of queryWords) {
    const index = lowerContent.indexOf(word)
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index
    }
  }

  if (bestIndex === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
  }

  const start = Math.max(0, bestIndex - 50)
  const end = Math.min(content.length, bestIndex + maxLength - 50)

  let excerpt = content.slice(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < content.length) excerpt = excerpt + '...'

  return excerpt
}

export function getSearchIndex(): { documents: SearchDocument[] } {
  if (documents.length === 0) {
    buildSearchIndex()
  }

  return { documents }
}
