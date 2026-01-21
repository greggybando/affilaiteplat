import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Test endpoint - no auth required, just to verify table works
export async function GET(request: NextRequest) {
  try {
    console.log('[Trips Test] Attempting to query trips table...')
    
    const { data: trips, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .limit(1)

    if (error) {
      console.error('[Trips Test] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ 
        error: 'Database error',
        code: error.code,
        message: error.message,
        details: error.details
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      trips: trips || [],
      message: 'Table query successful - RLS is not blocking'
    })
  } catch (error: any) {
    console.error('[Trips Test] Exception:', error)
    return NextResponse.json({ 
      error: 'Exception occurred',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

