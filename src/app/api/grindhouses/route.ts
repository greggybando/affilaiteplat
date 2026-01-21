import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      console.error('[Grindhouses API] No affiliate found - auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Grindhouses API] Fetching grindhouses for user:', affiliate.id)
    const { data: grindhouses, error } = await supabaseAdmin
      .from('grindhouses')
      .select('*')
      .eq('user_id', affiliate.id)
      .order('start_date', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('[Grindhouses API] Table does not exist yet')
        return NextResponse.json({ grindhouses: [] })
      }
      console.error('[Grindhouses API] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: 'Failed to fetch grindhouses', 
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // Transform to match frontend format
    const formattedGrindhouses = (grindhouses || []).map((grindhouse: any) => ({
      id: grindhouse.id,
      name: grindhouse.name,
      location: grindhouse.location,
      startDate: grindhouse.start_date,
      endDate: grindhouse.end_date,
      description: grindhouse.description || null,
      maxParticipants: grindhouse.max_participants || null,
      preferredPeople: grindhouse.preferred_people || null,
      duration: grindhouse.duration || null,
      vibeFocus: grindhouse.vibe_focus || null,
      participants: grindhouse.participants || [],
      goals: grindhouse.goals || [],
      created_at: grindhouse.created_at
    }))

    return NextResponse.json({ grindhouses: formattedGrindhouses })
  } catch (error: any) {
    console.error('API grindhouses GET error:', error)
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
    const { name, location, start_date, end_date, description, max_participants, preferred_people, duration, vibe_focus, forum_post_id } = body

    if (!name || !location || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: grindhouse, error } = await supabaseAdmin
      .from('grindhouses')
      .insert({
        user_id: affiliate.id,
        name,
        location,
        start_date,
        end_date,
        description: description || null,
        max_participants: max_participants || null,
        preferred_people: preferred_people || null,
        duration: duration || null,
        vibe_focus: vibe_focus || null,
        forum_post_id: forum_post_id || null,
        participants: [],
        goals: []
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Grindhouse creation error:', error)
      return NextResponse.json({ error: 'Failed to create grindhouse' }, { status: 500 })
    }

    const grindhouseData = grindhouse as any

    return NextResponse.json({
      grindhouse: {
        id: grindhouseData.id,
        name: grindhouseData.name,
        location: grindhouseData.location,
        startDate: grindhouseData.start_date,
        endDate: grindhouseData.end_date,
        description: grindhouseData.description || null,
        maxParticipants: grindhouseData.max_participants || null,
        preferredPeople: grindhouseData.preferred_people || null,
        duration: grindhouseData.duration || null,
        vibeFocus: grindhouseData.vibe_focus || null,
        participants: grindhouseData.participants || [],
        goals: grindhouseData.goals || [],
        created_at: grindhouseData.created_at
      }
    })
  } catch (error: any) {
    console.error('API grindhouses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

