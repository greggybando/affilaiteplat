import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/notifications/preferences - Get notification preferences
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // If no preferences exist, create default ones
    if (!data) {
      const { data: newPrefs, error: insertError } = await (supabaseAdmin
        .from('notification_preferences') as any)
        .insert({
          affiliate_id: affiliate.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating preferences:', insertError)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      return NextResponse.json({ preferences: newPrefs })
    }

    return NextResponse.json({ preferences: data })
  } catch (error: any) {
    console.error('API notification preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    // Check if preferences exist
    const { data: existing } = await supabaseAdmin
      .from('notification_preferences')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .single()

    let result
    if (existing) {
      // Update existing
      const { data, error } = await (supabaseAdmin
        .from('notification_preferences') as any)
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('affiliate_id', affiliate.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating preferences:', error)
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
      }
      result = data
    } else {
      // Create new
      const { data, error } = await (supabaseAdmin
        .from('notification_preferences') as any)
        .insert({
          affiliate_id: affiliate.id,
          ...preferences
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating preferences:', error)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ preferences: result })
  } catch (error: any) {
    console.error('API notification preferences update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

