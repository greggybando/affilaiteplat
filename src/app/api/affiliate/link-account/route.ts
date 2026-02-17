// src/app/api/affiliate/link-account/route.ts
// One-time script to link existing FirstPromoter account

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Only allow admin or the specific user
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, fp_promoter_id } = body

    // Check if admin or matching email
    const isAdminUser = await isAdmin()
    const isMatchingEmail = affiliate.email === email || affiliate.email === 'grant@reelstacks.ai'
    
    if (!isAdminUser && !isMatchingEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!process.env.FIRSTPROMOTER_API_KEY) {
      return NextResponse.json(
        { error: 'FirstPromoter API key not configured' },
        { status: 500 }
      )
    }

    // Fetch ref_id from FirstPromoter
    console.log('🔗 Linking account:', { email, fp_promoter_id })
    
    const response = await fetch(
      `https://firstpromoter.com/api/v1/promoters/show.json?id=${encodeURIComponent(fp_promoter_id)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    console.log('📥 FirstPromoter response:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from FirstPromoter', details: data },
        { status: response.status }
      )
    }

    const refId = data.default_ref_id || data.ref_id || null

    // Update Supabase
    const { error: updateError } = await (supabaseAdmin as any)
      .from('affiliates')
      .update({
        fp_promoter_id: fp_promoter_id.toString(),
        fp_ref_id: refId,
      })
      .eq('email', email)

    if (updateError) {
      console.error('❌ Error updating affiliate:', updateError)
      return NextResponse.json(
        { error: 'Failed to update affiliate', details: updateError },
        { status: 500 }
      )
    }

    console.log('✅ Account linked successfully:', { email, fp_promoter_id, refId })
    return NextResponse.json({
      success: true,
      email,
      fp_promoter_id,
      fp_ref_id: refId,
    })
  } catch (error: any) {
    console.error('❌ Error linking account:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

