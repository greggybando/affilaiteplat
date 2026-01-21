import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Using Tenor API as alternative (free, no API key needed for basic usage)
    // Or use Giphy with a working key
    const apiKey = 'dc6zaTOxFJmzC' // Giphy public beta key
    const endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`
    
    console.log('Fetching trending GIFs from:', endpoint)
    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      }
    })
    
    console.log('Giphy response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Giphy API error:', errorText)
      // Fallback: return some placeholder data structure
      return NextResponse.json({ 
        data: [],
        error: 'Failed to fetch trending GIFs',
        status: res.status 
      }, { status: 200 }) // Return 200 so frontend can handle empty state
    }
    
    const data = await res.json()
    console.log('Giphy response data keys:', Object.keys(data))
    console.log('Number of GIFs:', data.data?.length || 0)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching trending GIFs:', error)
    return NextResponse.json({ 
      data: [],
      error: 'Internal server error' 
    }, { status: 200 })
  }
}

