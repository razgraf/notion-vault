import { NextResponse } from 'next/server'
import { findNodeBySlug, parseIndexHtml } from '@/lib/parser/index-html'
import { readMarkdownFile, findFileByUuid } from '@/lib/parser/markdown'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // First try to find by slug in the nav tree
  const workspace = parseIndexHtml()
  const node = findNodeBySlug(workspace.tree, id)

  let filePath: string | null = null

  if (node?.filePath) {
    filePath = node.filePath
  } else {
    // Extract UUID from slug (last 8+ chars after the last dash)
    const slugParts = id.split('-')
    const uuid = slugParts[slugParts.length - 1]
    if (uuid && uuid.length >= 8) {
      filePath = findFileByUuid(uuid)
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const pageContent = readMarkdownFile(filePath)

  if (!pageContent) {
    return NextResponse.json({ error: 'Failed to read page' }, { status: 500 })
  }

  return NextResponse.json({
    title: pageContent.title,
    content: pageContent.content,
    images: pageContent.images,
    icon: pageContent.icon,
    filePath,
  })
}
