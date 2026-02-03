import fs from 'fs'
import path from 'path'
import { getMarkdownPath, getConfig } from '../config'
import { findHtmlFile, extractPageIcon } from './html-metadata'

export interface PageContent {
  title: string
  content: string
  images: string[]
  icon?: string
}

function extractTitleFromContent(content: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m)
  return h1Match ? h1Match[1].trim() : 'Untitled'
}

function extractImages(content: string, basePath: string): string[] {
  const images: string[] = []
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  let match

  while ((match = imgRegex.exec(content)) !== null) {
    const imgPath = match[2]
    // Only include local images (relative paths)
    if (!imgPath.startsWith('http://') && !imgPath.startsWith('https://')) {
      images.push(imgPath)
    }
  }

  return images
}

export function resolveFilePath(relativePath: string): string | null {
  const basePath = getMarkdownPath()
  const fullPath = path.join(basePath, relativePath)

  if (fs.existsSync(fullPath)) {
    return fullPath
  }

  return null
}

export function readMarkdownFile(filePath: string): PageContent | null {
  const fullPath = resolveFilePath(filePath)

  if (!fullPath) {
    return null
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const title = extractTitleFromContent(content)
  const basePath = path.dirname(filePath)
  const images = extractImages(content, basePath)

  // Extract icon from HTML file if icons enabled
  let icon: string | undefined
  const config = getConfig()
  if (config.features.icons) {
    const htmlFile = findHtmlFile(fullPath)
    if (htmlFile) {
      icon = extractPageIcon(htmlFile) ?? undefined
    }
  }

  return { title, content, images, icon }
}

export function findFileByUuid(uuid: string): string | null {
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
      } else if (entry.name.endsWith('.md')) {
        const nameWithoutExt = entry.name.replace('.md', '')
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
