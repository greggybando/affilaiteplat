import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: affiliate, error } = await (supabaseAdmin as any)
      .from('affiliates')
      .select('id, name, avatar_name, avatar_url')
      .eq('id', id)
      .single()

    if (error || !affiliate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(affiliate)
  } catch (error) {
    console.error('Error fetching affiliate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

