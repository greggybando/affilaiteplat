import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ unlocks: [] })

    const { data } = await (supabaseAdmin as any).from('user_unlocks').select('unlock_key').eq('user_id', userId)
    return NextResponse.json({ unlocks: (data || []).map((u: any) => u.unlock_key) })
}

