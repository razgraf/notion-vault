'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NavTree, useExpandedNodes } from './NavTree'
import type { NavNode } from '@/lib/parser/index-html'

interface SidebarProps {
  workspaceName: string
  tree: NavNode[]
  onOpenSearch: () => void
}

export function Sidebar({ workspaceName, tree, onOpenSearch }: SidebarProps) {
  const pathname = usePathname()
  const currentSlug = pathname.startsWith('/page/') ? pathname.slice(6) : undefined
  const { expandedNodes, toggle, expandAll, collapseAll } = useExpandedNodes(tree, currentSlug)

  return (
    <aside className="fixed top-0 left-0 h-screen w-[260px] bg-bg-secondary border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="block">
          <h1 className="font-semibold text-text-primary truncate">{workspaceName}</h1>
        </Link>
      </div>

      {/* Home link */}
      <Link
        href="/"
        className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-hover rounded-md transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Home</span>
      </Link>

      {/* Search button */}
      <button
        onClick={onOpenSearch}
        className="mx-3 mt-1 flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-hover rounded-md transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>Search</span>
        <kbd className="ml-auto text-xs bg-bg-primary px-1.5 py-0.5 rounded">
          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      {/* Expand/Collapse controls */}
      <div className="flex gap-2 px-3 mt-3 text-xs">
        <button
          onClick={expandAll}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          Expand all
        </button>
        <span className="text-text-secondary">/</span>
        <button
          onClick={collapseAll}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          Collapse all
        </button>
      </div>

      {/* Navigation tree */}
      <nav className="flex-1 overflow-y-auto p-2 mt-2">
        <NavTree
          nodes={tree}
          currentSlug={currentSlug}
          expandedNodes={expandedNodes}
          onToggle={toggle}
        />
      </nav>
    </aside>
  )
}
