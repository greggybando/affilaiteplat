import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }
    
    const apiKey = 'dc6zaTOxFJmzC' // Giphy public beta key
    const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=24&rating=g`
    
    const res = await fetch(endpoint)
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to search GIFs' }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching GIFs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

