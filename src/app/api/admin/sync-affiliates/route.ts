// src/app/api/admin/sync-affiliates/route.ts
// Syncs affiliate data from FirstPromoter to Supabase

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Check admin access
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminCheck = await isAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!process.env.FIRSTPROMOTER_API_KEY) {
      return NextResponse.json(
        { error: 'FirstPromoter API key not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { limit = 100, offset = 0 } = body

    console.log('🔄 Starting affiliate sync from FirstPromoter...', { limit, offset })

    // Fetch promoters from FirstPromoter
    // Note: FirstPromoter API doesn't have a direct "list all promoters" endpoint
    // We'll need to fetch promoters individually or use their webhook/list endpoint if available
    // For now, we'll sync based on existing Supabase affiliates that have emails
    
    // Get all affiliates from Supabase that don't have fp_promoter_id
    const { data: affiliatesWithoutFp, error: fetchError } = await (supabaseAdmin as any)
      .from('affiliates')
      .select('id, email, name, fp_promoter_id, fp_ref_id')
      .is('fp_promoter_id', null)
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('❌ Error fetching affiliates:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch affiliates', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!affiliatesWithoutFp || affiliatesWithoutFp.length === 0) {
      return NextResponse.json({
        message: 'No affiliates found without FirstPromoter IDs',
        synced: 0,
        failed: 0,
      })
    }

    console.log(`📋 Found ${affiliatesWithoutFp.length} affiliates to sync`)

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Try to find/create FirstPromoter accounts for each affiliate
    for (const affiliate of affiliatesWithoutFp) {
      try {
        const email = affiliate.email
        const name = affiliate.name || ''

        // Try to find existing promoter by email
        const findResponse = await fetch(
          `https://firstpromoter.com/api/v1/promoters/show.json?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        )

        let fpPromoterId: string | null = null
        let fpRefId: string | null = null

        if (findResponse.ok) {
          const findData = await findResponse.json()
          if (findData.id) {
            fpPromoterId = findData.id.toString()
            fpRefId = findData.default_ref_id || findData.ref_id || null
            console.log(`✅ Found existing FirstPromoter account for ${email}: ${fpPromoterId}`)
          }
        } else {
          // Try to create new account
          const nameParts = name.trim().split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''

          const createResponse = await fetch(
            'https://firstpromoter.com/api/v1/promoters/create.json',
            {
              method: 'POST',
              headers: {
                'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                first_name: firstName,
                last_name: lastName,
              }),
            }
          )

          if (createResponse.ok) {
            const createData = await createResponse.json()
            if (createData.id) {
              fpPromoterId = createData.id.toString()
              fpRefId = createData.default_ref_id || createData.ref_id || null
              console.log(`✅ Created new FirstPromoter account for ${email}: ${fpPromoterId}`)
            }
          } else {
            const errorData = await createResponse.json()
            console.error(`❌ Failed to create/find FirstPromoter account for ${email}:`, errorData)
            results.failed++
            results.errors.push(`${email}: ${errorData.error || 'Unknown error'}`)
            continue
          }
        }

        // Update Supabase with FirstPromoter data
        if (fpPromoterId) {
          const { error: updateError } = await (supabaseAdmin as any)
            .from('affiliates')
            .update({
              fp_promoter_id: fpPromoterId,
              fp_ref_id: fpRefId,
            } as any)
            .eq('id', affiliate.id)

          if (updateError) {
            console.error(`❌ Failed to update Supabase for ${email}:`, updateError)
            results.failed++
            results.errors.push(`${email}: Database update failed`)
          } else {
            results.synced++
            console.log(`✅ Synced ${email} (${fpPromoterId})`)
          }
        }
      } catch (error: any) {
        console.error(`❌ Error syncing affiliate ${affiliate.email}:`, error)
        results.failed++
        results.errors.push(`${affiliate.email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      synced: results.synced,
      failed: results.failed,
      errors: results.errors,
      totalProcessed: affiliatesWithoutFp.length,
    })
  } catch (error: any) {
    console.error('❌ Error in sync-affiliates route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

