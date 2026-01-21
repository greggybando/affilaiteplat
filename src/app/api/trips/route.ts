import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      console.error('[Trips API] No affiliate found - auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Trips API] Fetching trips for user:', affiliate.id)
    const { data: trips, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('user_id', affiliate.id)
      .order('start_date', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('[Trips API] Table does not exist yet')
        return NextResponse.json({ trips: [] })
      }
      console.error('[Trips API] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: 'Failed to fetch trips', 
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // Transform to match frontend format
    const formattedTrips = (trips || []).map((trip: any) => ({
      id: trip.id,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      description: trip.description || null,
      budget: trip.budget || null,
      participants: trip.participants || [],
      itinerary: trip.itinerary || [],
      created_at: trip.created_at
    }))

    return NextResponse.json({ trips: formattedTrips })
  } catch (error: any) {
    console.error('API trips GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { destination, start_date, end_date, description, budget } = body

    if (!destination || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: trip, error } = await supabaseAdmin
      .from('trips')
      .insert({
        user_id: affiliate.id,
        destination,
        start_date,
        end_date,
        description: description || null,
        budget: budget || null,
        participants: [],
        itinerary: []
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Trip creation error:', error)
      return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
    }

    const tripData = trip as any

    return NextResponse.json({
      trip: {
        id: tripData.id,
        destination: tripData.destination,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        description: tripData.description || null,
        budget: tripData.budget || null,
        participants: tripData.participants || [],
        itinerary: tripData.itinerary || [],
        created_at: tripData.created_at
      }
    })
  } catch (error: any) {
    console.error('API trips POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

