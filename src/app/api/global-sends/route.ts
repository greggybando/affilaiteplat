import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      console.error('[Global Sends API] No affiliate found - auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Global Sends API] Fetching global sends for user:', affiliate.id)
    const { data: globalSends, error } = await supabaseAdmin
      .from('global_sends')
      .select('*')
      .eq('user_id', affiliate.id)
      .order('start_date', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('[Global Sends API] Table does not exist yet')
        return NextResponse.json({ globalSends: [] })
      }
      console.error('[Global Sends API] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: 'Failed to fetch global sends', 
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // Transform to match frontend format
    const formattedGlobalSends = (globalSends || []).map((gs: any) => ({
      id: gs.id,
      destination: gs.destination,
      startDate: gs.start_date,
      endDate: gs.end_date,
      description: gs.description || null,
      budget: gs.budget || gs.budget_range || null,
      preferredPeople: gs.preferred_people || null,
      vibePurpose: gs.vibe_purpose || null,
      budgetRange: gs.budget_range || null,
      participants: gs.participants || [],
      created_at: gs.created_at
    }))

    return NextResponse.json({ globalSends: formattedGlobalSends })
  } catch (error: any) {
    console.error('API global-sends GET error:', error)
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
    const { destination, start_date, end_date, description, budget, preferred_people, vibe_purpose, budget_range, forum_post_id } = body

    if (!destination || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: globalSend, error } = await supabaseAdmin
      .from('global_sends')
      .insert({
        user_id: affiliate.id,
        destination,
        start_date,
        end_date,
        description: description || null,
        budget: budget || null,
        preferred_people: preferred_people || null,
        vibe_purpose: vibe_purpose || null,
        budget_range: budget_range || null,
        forum_post_id: forum_post_id || null,
        participants: []
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Global send creation error:', error)
      return NextResponse.json({ error: 'Failed to create global send' }, { status: 500 })
    }

    const globalSendData = globalSend as any

    return NextResponse.json({
      globalSend: {
        id: globalSendData.id,
        destination: globalSendData.destination,
        startDate: globalSendData.start_date,
        endDate: globalSendData.end_date,
        description: globalSendData.description || null,
        budget: globalSendData.budget || globalSendData.budget_range || null,
        preferredPeople: globalSendData.preferred_people || null,
        vibePurpose: globalSendData.vibe_purpose || null,
        budgetRange: globalSendData.budget_range || null,
        participants: globalSendData.participants || [],
        created_at: globalSendData.created_at
      }
    })
  } catch (error: any) {
    console.error('API global-sends POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

