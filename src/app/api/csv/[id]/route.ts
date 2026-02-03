import { NextResponse } from 'next/server'
import path from 'path'
import { findNodeBySlug, parseIndexHtml } from '@/lib/parser/index-html'
import { getCsvPair, findCsvByUuid } from '@/lib/parser/csv'
import { findHtmlFileForCsv, extractPropertyColors } from '@/lib/parser/html-metadata'
import { getMarkdownPath, getConfig } from '@/lib/config'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // First try to find by slug in the nav tree
  const workspace = parseIndexHtml()
  const node = findNodeBySlug(workspace.tree, id)

  let filePath: string | null = null

  if (node?.filePath && node.isCsv) {
    filePath = node.filePath
  } else {
    // Extract UUID from slug (last 8+ chars after the last dash)
    const slugParts = id.split('-')
    const uuid = slugParts[slugParts.length - 1]
    if (uuid && uuid.length >= 8) {
      filePath = findCsvByUuid(uuid)
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'CSV not found' }, { status: 404 })
  }

  const csvPair = getCsvPair(filePath)

  if (!csvPair) {
    return NextResponse.json({ error: 'Failed to read CSV' }, { status: 500 })
  }

  // Extract property colors from HTML if icons feature enabled
  let propertyColors: Record<string, string> = {}
  const config = getConfig()
  if (config.features.icons) {
    const basePath = getMarkdownPath()
    const fullCsvPath = path.join(basePath, filePath)
    const htmlFile = findHtmlFileForCsv(fullCsvPath)
    if (htmlFile) {
      const colors = extractPropertyColors(htmlFile)
      propertyColors = Object.fromEntries(colors)
    }
  }

  return NextResponse.json({
    filtered: csvPair.filtered,
    all: csvPair.all,
    propertyColors,
    filePath,
  })
}
