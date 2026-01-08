import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { accessLevel } = body

    // Update onboarding status
    const updateData: any = {
      onboarding_completed: true,
    }

    if (accessLevel) {
      updateData.access_level = accessLevel
    }

    const { error: updateError } = await (supabaseAdmin
      .from('affiliates') as any)
      .update(updateData)
      .eq('id', affiliate.id)

    if (updateError) {
      console.error('Error completing onboarding:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Onboarding complete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





