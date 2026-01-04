import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateTrackingCode } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if affiliate already has a referral code
    const { data: existingCode } = await (supabaseAdmin as any)
      .from('referral_codes')
      .select('code')
      .eq('affiliate_id', affiliate.id)
      .eq('is_active', true)
      .single()

    if (existingCode) {
      return NextResponse.json({ 
        code: (existingCode as any).code,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref=${(existingCode as any).code}`
      })
    }

    // Generate unique referral code
    let code = generateTrackingCode(8).toUpperCase()
    let attempts = 0
    let isUnique = false

    while (!isUnique && attempts < 10) {
      const { data: existing } = await (supabaseAdmin as any)
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) {
        isUnique = true
      } else {
        code = generateTrackingCode(8).toUpperCase()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 })
    }

    // Create referral code
    const { data: referralCode, error } = await (supabaseAdmin as any)
      .from('referral_codes')
      .insert({
        affiliate_id: affiliate.id,
        code: code,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating referral code:', error)
      return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({
      code: code,
      url: `${appUrl}/signup?ref=${code}`
    })
  } catch (error: any) {
    console.error('Error generating referral code:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

