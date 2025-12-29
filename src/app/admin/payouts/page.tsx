import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PayoutProcessor } from './PayoutProcessor'

async function getPayableAffiliates() {
  // Get affiliates with approved commissions
  const { data } = await supabaseAdmin
    .from('affiliates')
    .select(`
      id,
      name,
      email,
      payout_method,
      paypal_email,
      stripe_account_id,
      status
    `)
    .eq('status', 'active')

  if (!data) return []

  // Get their approved commission totals
  const affiliatesWithCommissions = await Promise.all(
    data.map(async (affiliate: {
      id: string
      name: string
      email: string
      payout_method: string | null
      paypal_email: string | null
      stripe_account_id: string | null
      status: string
    }) => {
      const { data: conversions } = await supabaseAdmin
        .from('conversions')
        .select('id, commission_cents')
        .eq('affiliate_id', affiliate.id)
        .eq('status', 'approved')

      const totalApproved = conversions?.reduce((sum: number, c: { commission_cents: number }) => sum + c.commission_cents, 0) || 0
      const conversionIds = conversions?.map((c: { id: string }) => c.id) || []

      return {
        ...affiliate,
        payout_method: (affiliate.payout_method === 'paypal' || affiliate.payout_method === 'stripe' 
          ? affiliate.payout_method 
          : null) as 'paypal' | 'stripe' | null,
        approved_cents: totalApproved,
        conversion_ids: conversionIds,
      }
    })
  )

  return affiliatesWithCommissions.filter((a) => a.approved_cents > 0)
}

export default async function PayoutsPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/login')
  }

  const payableAffiliates = await getPayableAffiliates()
  const totalPending = payableAffiliates.reduce((sum, a) => sum + a.approved_cents, 0)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-white">Process Payouts</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Total Pending Payouts</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                ${(totalPending / 100).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400">{payableAffiliates.length} affiliates</p>
            </div>
          </div>
        </div>

        {/* Affiliate List */}
        {payableAffiliates.length > 0 ? (
          <PayoutProcessor affiliates={payableAffiliates} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            No pending payouts at this time.
          </div>
        )}
      </main>
    </div>
  )
}
