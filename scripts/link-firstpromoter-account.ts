// scripts/link-firstpromoter-account.ts
// One-time script to link grant@reelstacks.ai with FirstPromoter account

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const FIRSTPROMOTER_API_KEY = process.env.FIRSTPROMOTER_API_KEY!

async function linkAccount() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const fpPromoterId = '13602869'
  const email = 'grant@reelstacks.ai'

  console.log('🔗 Linking account:', { email, fpPromoterId })

  // Fetch ref_id from FirstPromoter
  const response = await fetch(
    `https://firstpromoter.com/api/v1/promoters/show.json?id=${fpPromoterId}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': FIRSTPROMOTER_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  )

  const data = await response.json()
  console.log('📥 FirstPromoter response:', JSON.stringify(data, null, 2))

  if (!response.ok) {
    console.error('❌ Failed to fetch from FirstPromoter:', data)
    process.exit(1)
  }

  const refId = data.default_ref_id || data.ref_id || null
  console.log('📝 Extracted ref_id:', refId)

  // Update Supabase
  const { error } = await supabase
    .from('affiliates')
    .update({
      fp_promoter_id: fpPromoterId,
      fp_ref_id: refId,
    })
    .eq('email', email)

  if (error) {
    console.error('❌ Error updating affiliate:', error)
    process.exit(1)
  }

  console.log('✅ Account linked successfully!')
  console.log({ email, fp_promoter_id: fpPromoterId, fp_ref_id: refId })
}

linkAccount().catch(console.error)

