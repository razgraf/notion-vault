import { type NextRequest, NextResponse } from 'next/server'
import { search, getSearchIndex } from '@/lib/search'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limitParam = searchParams.get('limit')

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 20
  const results = search(query, limit)

  return NextResponse.json({ results })
}

// Endpoint to get the full search index for client-side search
export async function POST() {
  const index = getSearchIndex()
  return NextResponse.json(index)
}
