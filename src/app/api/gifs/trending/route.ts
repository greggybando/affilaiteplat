import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = 'dc6zaTOxFJmzC' // Giphy public beta key
    const endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`
    
    const res = await fetch(endpoint)
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch trending GIFs' }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching trending GIFs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

