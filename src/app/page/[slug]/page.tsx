'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageContent } from '@/components/PageContent'
import { Table } from '@/components/Table'
import type { NavNode } from '@/lib/parser/index-html'

interface WorkspaceData {
  id: string
  name: string
  tree: NavNode[]
}

interface PageData {
  title: string
  content: string
  images: string[]
  icon?: string
  filePath: string
}

interface CsvData {
  headers: string[]
  rows: Record<string, string>[]
}

interface CsvPair {
  filtered: CsvData
  all: CsvData
  propertyColors?: Record<string, string>
  filePath: string
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [csvData, setCsvData] = useState<CsvPair | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCsv, setIsCsv] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch workspace data for breadcrumbs
  useEffect(() => {
    fetch('/api/nav')
      .then((res) => res.json())
      .then(setWorkspace)
  }, [])

  // Fetch page content
  useEffect(() => {
    setPageData(null)
    setCsvData(null)
    setError(null)
    setIsLoading(true)

    // First try to fetch as a markdown page
    fetch(`/api/page/${slug}`)
      .then((res) => {
        if (res.ok) {
          setIsCsv(false)
          return res.json().then(setPageData)
        }
        // If not found, try CSV
        return fetch(`/api/csv/${slug}`).then((csvRes) => {
          if (csvRes.ok) {
            setIsCsv(true)
            return csvRes.json().then(setCsvData)
          }
          // Neither found - might be a section without content
          setError('no-content')
        })
      })
      .catch(() => setError('no-content'))
      .finally(() => setIsLoading(false))
  }, [slug])

  // Find current node and breadcrumbs
  const currentNode = workspace ? findNodeBySlug(workspace.tree, slug) : null
  const breadcrumbs = workspace ? findBreadcrumbs(workspace.tree, slug) : []

  // If no content but has children, show children table
  const hasChildren = currentNode && currentNode.children.length > 0
  const showChildrenTable = error === 'no-content' && hasChildren

  if (isLoading || !workspace) {
    return <div className="text-text-secondary">Loading...</div>
  }

  if (error && !showChildrenTable) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold text-text-primary mb-2">Page Not Found</h1>
        <p className="text-text-secondary">This page doesn&apos;t exist or has no content.</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      {showChildrenTable && currentNode ? (
        <ChildrenTable node={currentNode} />
      ) : isCsv && csvData ? (
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            {breadcrumbs[breadcrumbs.length - 1]?.title || 'Data'}
          </h1>
          <Table
            filtered={csvData.filtered}
            all={csvData.all}
            linkedPages={currentNode?.children.filter((c) => !c.isCsv).map((c) => ({ title: c.title, slug: c.slug }))}
            propertyColors={csvData.propertyColors}
          />
        </div>
      ) : pageData ? (
        <>
          <PageContent
            content={pageData.content}
            filePath={pageData.filePath}
            navTree={workspace?.tree || []}
            icon={pageData.icon}
          />
          {/* Show children table below content if page has children */}
          {currentNode && currentNode.children.length > 0 && (
            <div className="mt-8">
              <ChildrenTable node={currentNode} showTitle />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function ChildrenTable({ node, showTitle = false }: { node: NavNode; showTitle?: boolean }) {
  const pageChildren = node.children.filter((child) => !child.isCsv)

  if (pageChildren.length === 0) return null

  return (
    <div>
      {!showTitle && <h1 className="text-2xl font-bold text-text-primary mb-4">{node.title}</h1>}
      {showTitle && (
        <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sub-pages ({pageChildren.length})
        </h2>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-secondary">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                Title
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary w-24">
                Pages
              </th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {pageChildren.map((child) => (
              <tr key={child.id} className="border-t border-border hover:bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-text-primary">{child.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {child.children.length > 0 ? child.children.length : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/page/${child.slug}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded bg-bg-tertiary hover:bg-accent text-text-secondary hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function findNodeBySlug(tree: NavNode[], targetSlug: string): NavNode | null {
  const slugParts = targetSlug.split('-')
  const targetUuid = slugParts[slugParts.length - 1]

  function search(nodes: NavNode[]): NavNode | null {
    for (const node of nodes) {
      if (node.slug === targetSlug || (targetUuid && node.id.startsWith(targetUuid))) {
        return node
      }
      const found = search(node.children)
      if (found) return found
    }
    return null
  }

  return search(tree)
}

function findBreadcrumbs(tree: NavNode[], targetSlug: string): NavNode[] {
  const slugParts = targetSlug.split('-')
  const targetUuid = slugParts[slugParts.length - 1]

  function search(nodes: NavNode[], path: NavNode[] = []): NavNode[] | null {
    for (const node of nodes) {
      const newPath = [...path, node]
      if (node.slug === targetSlug || (targetUuid && node.id.startsWith(targetUuid))) {
        return newPath
      }
      const found = search(node.children, newPath)
      if (found) return found
    }
    return null
  }

  return search(tree) || []
}
