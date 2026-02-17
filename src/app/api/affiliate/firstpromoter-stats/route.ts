// src/app/api/affiliate/firstpromoter-stats/route.ts
// Fetches promoter data from FirstPromoter API

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.FIRSTPROMOTER_API_KEY) {
      console.error('❌ FIRSTPROMOTER_API_KEY not configured')
      return NextResponse.json(
        { error: 'FirstPromoter API key not configured' },
        { status: 500 }
      )
    }

    let fpPromoterId = (affiliate as any).fp_promoter_id
    const affiliateEmail = affiliate.email
    const affiliateName = affiliate.name

    console.log('🔍 Starting FirstPromoter fetch:', {
      affiliateId: affiliate.id,
      email: affiliateEmail,
      existingFpPromoterId: fpPromoterId,
    })

    // Step 2: If fp_promoter_id is NULL, auto-create or find the FP account
    if (!fpPromoterId) {
      console.log('📝 No fp_promoter_id found, attempting to create/find account...')
      
      // Try to create account first
      try {
        const nameParts = (affiliateName || '').trim().split(' ')
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
              email: affiliateEmail,
              first_name: firstName,
              last_name: lastName,
            }),
          }
        )

        const createData = await createResponse.json()
        console.log('📤 Create promoter response:', {
          status: createResponse.status,
          data: JSON.stringify(createData, null, 2),
        })

        if (createResponse.ok && createData.id) {
          fpPromoterId = createData.id.toString()
          const refId = createData.default_ref_id || createData.ref_id || null
          
          // Save to Supabase
          await (supabaseAdmin as any)
            .from('affiliates')
            .update({
              fp_promoter_id: fpPromoterId,
              fp_ref_id: refId,
            })
            .eq('id', affiliate.id)
          
          console.log('✅ Created and saved new FirstPromoter account:', {
            fpPromoterId,
            refId,
          })
        } else if (createData.error && createData.error.includes('already exists')) {
          // Account already exists, find it by email
          console.log('⚠️ Account already exists, fetching by email...')
          
          const findResponse = await fetch(
            `https://firstpromoter.com/api/v1/promoters/show.json?email=${encodeURIComponent(affiliateEmail)}`,
            {
              method: 'GET',
              headers: {
                'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
                'Content-Type': 'application/json',
              },
            }
          )

          const findData = await findResponse.json()
          console.log('🔍 Find by email response:', {
            status: findResponse.status,
            data: JSON.stringify(findData, null, 2),
          })

          if (findResponse.ok && findData.id) {
            fpPromoterId = findData.id.toString()
            const refId = findData.default_ref_id || findData.ref_id || null
            
            // Save to Supabase
            await (supabaseAdmin as any)
              .from('affiliates')
              .update({
                fp_promoter_id: fpPromoterId,
                fp_ref_id: refId,
              })
              .eq('id', affiliate.id)
            
            console.log('✅ Found and saved existing FirstPromoter account:', {
              fpPromoterId,
              refId,
            })
          }
        }
      } catch (createError: any) {
        console.error('❌ Error creating/finding FirstPromoter account:', createError)
      }
    }

    if (!fpPromoterId) {
      console.error('❌ No fp_promoter_id available after create/find attempt')
      return NextResponse.json(
        { error: 'Could not create or find FirstPromoter account' },
        { status: 500 }
      )
    }

    // Step 1: Fetch promoter data from FirstPromoter
    console.log('📡 Fetching promoter data from FirstPromoter:', {
      fpPromoterId,
      url: `https://firstpromoter.com/api/v1/promoters/show.json?id=${fpPromoterId}`,
    })

    const response = await fetch(
      `https://firstpromoter.com/api/v1/promoters/show.json?id=${encodeURIComponent(fpPromoterId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    const responseText = await response.text()
    let data: any = {}
    
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse FirstPromoter response as JSON:', {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText.substring(0, 500),
      })
      return NextResponse.json(
        { error: 'Invalid response from FirstPromoter API' },
        { status: 500 }
      )
    }

    console.log('📥 FirstPromoter API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      fullResponse: JSON.stringify(data, null, 2),
    })

    if (!response.ok) {
      console.error('❌ FirstPromoter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error || data.message || 'Unknown error',
        fullResponse: JSON.stringify(data, null, 2),
      })
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Promoter not found in FirstPromoter', data: null },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: `FirstPromoter API error: ${response.status}`, data },
        { status: response.status }
      )
    }

    // Step 4: Return full response
    console.log('✅ Successfully fetched FirstPromoter data')
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('❌ Error in firstpromoter-stats route:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

