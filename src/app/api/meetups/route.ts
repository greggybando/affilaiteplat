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
      date: meetup.date_time ? meetup.date_time.split('T')[0] : meetup.date,
      time: meetup.date_time ? meetup.date_time.split('T')[1]?.substring(0, 5) : meetup.time || null,
      description: meetup.description || null,
      maxParticipants: meetup.max_attendees || meetup.max_participants || null,
      type: meetup.type || null,
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
      console.error('[Meetups API POST] No affiliate found - auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Meetups API POST] Received body:', JSON.stringify(body, null, 2))
    const { name, location, date, time, date_time, description, max_participants, max_attendees, type, forum_post_id } = body

    // Support both old format (date + time) and new format (date_time)
    const meetupDateTime = date_time || (date && time ? `${date}T${time}` : date)

    if (!name || !location || !meetupDateTime) {
      console.error('[Meetups API POST] Missing required fields:', { name, location, date_time, date, time })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract date from date_time if date is not provided
    let meetupDate = date
    if (!meetupDate && meetupDateTime) {
      // Extract date part from date_time (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
      meetupDate = meetupDateTime.split('T')[0]
    }

    const insertData = {
      user_id: affiliate.id,
      name,
      location,
      date: meetupDate || null, // Extract from date_time if not provided
      time: time || null, // Keep for backward compatibility
      date_time: meetupDateTime || null,
      description: description || null,
      max_participants: max_participants || max_attendees || null,
      max_attendees: max_attendees || max_participants || null,
      type: type || null,
      forum_post_id: forum_post_id || null,
      participants: []
    }
    
    console.log('[Meetups API POST] Inserting data:', JSON.stringify(insertData, null, 2))

    const { data: meetup, error } = await supabaseAdmin
      .from('meetups')
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      console.error('[Meetups API POST] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: 'Failed to create meetup',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }
    
    console.log('[Meetups API POST] Successfully created meetup:', meetup)

    const meetupData = meetup as any

    return NextResponse.json({
      meetup: {
        id: meetupData.id,
        name: meetupData.name,
        location: meetupData.location,
        date: meetupData.date_time ? meetupData.date_time.split('T')[0] : meetupData.date,
        time: meetupData.date_time ? meetupData.date_time.split('T')[1]?.substring(0, 5) : meetupData.time || null,
        description: meetupData.description || null,
        maxParticipants: meetupData.max_attendees || meetupData.max_participants || null,
        type: meetupData.type || null,
        participants: meetupData.participants || [],
        created_at: meetupData.created_at
      }
    })
  } catch (error: any) {
    console.error('API meetups POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

