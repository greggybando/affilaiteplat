import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Simple debug endpoint to see ALL checkpoints directly
export async function GET(request: NextRequest) {
  try {
    const { data: checkpoints, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, title, section_id, video_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      count: checkpoints?.length || 0,
      checkpoints: checkpoints || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

