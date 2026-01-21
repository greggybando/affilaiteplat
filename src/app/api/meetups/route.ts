import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      console.error('[Meetups API] No affiliate found - auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Meetups API] Fetching meetups for user:', affiliate.id)
    const { data: meetups, error } = await supabaseAdmin
      .from('meetups')
      .select('*')
      .eq('user_id', affiliate.id)
      .order('date', { ascending: true })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('[Meetups API] Table does not exist yet')
        return NextResponse.json({ meetups: [] })
      }
      console.error('[Meetups API] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: 'Failed to fetch meetups', 
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // Transform to match frontend format
    const formattedMeetups = (meetups || []).map((meetup: any) => ({
      id: meetup.id,
      name: meetup.name,
      location: meetup.location,
      date: meetup.date,
      time: meetup.time || null,
      description: meetup.description || null,
      maxParticipants: meetup.max_participants || null,
      participants: meetup.participants || [],
      created_at: meetup.created_at
    }))

    return NextResponse.json({ meetups: formattedMeetups })
  } catch (error: any) {
    console.error('API meetups GET error:', error)
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
    const { name, location, date, time, description, max_participants } = body

    if (!name || !location || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: meetup, error } = await supabaseAdmin
      .from('meetups')
      .insert({
        user_id: affiliate.id,
        name,
        location,
        date,
        time: time || null,
        description: description || null,
        max_participants: max_participants || null,
        participants: []
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Meetup creation error:', error)
      return NextResponse.json({ error: 'Failed to create meetup' }, { status: 500 })
    }

    const meetupData = meetup as any

    return NextResponse.json({
      meetup: {
        id: meetupData.id,
        name: meetupData.name,
        location: meetupData.location,
        date: meetupData.date,
        time: meetupData.time || null,
        description: meetupData.description || null,
        maxParticipants: meetupData.max_participants || null,
        participants: meetupData.participants || [],
        created_at: meetupData.created_at
      }
    })
  } catch (error: any) {
    console.error('API meetups POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

