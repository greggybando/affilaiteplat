import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { calculatePodWeightClass } from '@/lib/pod-battles'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const podId = searchParams.get('podId')

    if (!podId) {
      return NextResponse.json({ error: 'podId is required' }, { status: 400 })
    }

    const weightClass = await calculatePodWeightClass(podId, supabaseAdmin)

    return NextResponse.json({ weightClass })
  } catch (error: any) {
    console.error('Get weight class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




