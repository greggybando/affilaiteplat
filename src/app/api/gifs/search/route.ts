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
    
    console.log('Searching GIFs for:', query)
    console.log('Endpoint:', endpoint)
    
    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      }
    })
    
    console.log('Giphy search response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Giphy API error:', errorText)
      return NextResponse.json({ 
        data: [],
        error: 'Failed to search GIFs',
        status: res.status 
      }, { status: 200 })
    }
    
    const data = await res.json()
    console.log('Giphy search response data keys:', Object.keys(data))
    console.log('Number of GIFs found:', data.data?.length || 0)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching GIFs:', error)
    return NextResponse.json({ 
      data: [],
      error: 'Internal server error' 
    }, { status: 200 })
  }
}

