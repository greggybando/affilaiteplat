import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

async function getOverview() {
  const { data } = await supabaseAdmin
    .from('admin_overview')
    .select('*')
    .single()
  return data as {
    trial_affiliates?: number
    paying_affiliates?: number
    clicks_30d?: number
    conversions_30d?: number
    pending_payouts_cents?: number
  } | null
}

async function getRecentAffiliates() {
  const { data } = await supabaseAdmin
    .from('affiliates')
    .select('id, name, email, status, trial_ends_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  return (data || []) as Array<{
    id: string
    name: string
    email: string
    status: string
    trial_ends_at: string | null
    created_at: string
  }>
}

async function getPendingPayouts() {
  const { data } = await supabaseAdmin
    .from('conversions')
    .select(`
      id,
      commission_cents,
      converted_at,
      affiliate:affiliates (
        id,
        name,
        email
      )
    `)
    .eq('status', 'approved')
    .order('converted_at', { ascending: true })
  return data || []
}

export default async function AdminPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/login')
  }

  const [overview, recentAffiliates, pendingPayouts] = await Promise.all([
    getOverview(),
    getRecentAffiliates(),
    getPendingPayouts(),
  ])

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <nav className="flex items-center gap-6">
            <Link href="/admin/products" className="text-gray-400 hover:text-white text-sm">
              Products
            </Link>
            <Link href="/admin/pages" className="text-gray-400 hover:text-white text-sm">
              Landing Pages
            </Link>
            <Link href="/admin/affiliates" className="text-gray-400 hover:text-white text-sm">
              Affiliates
            </Link>
            <Link href="/admin/payouts" className="text-gray-400 hover:text-white text-sm">
              Payouts
            </Link>
            <Link href="/admin/bounties" className="text-gray-400 hover:text-white text-sm">
              Bounties
            </Link>
            <Link href="/api/auth/logout" prefetch={false} className="text-gray-400 hover:text-white text-sm">
              Logout
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Trial Affiliates" value={overview?.trial_affiliates || 0} />
          <StatCard label="Paying Affiliates" value={overview?.paying_affiliates || 0} color="green" />
          <StatCard label="Clicks (30d)" value={overview?.clicks_30d || 0} />
          <StatCard label="Conversions (30d)" value={overview?.conversions_30d || 0} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Affiliates */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Affiliates</h2>
            <div className="space-y-3">
              {recentAffiliates.map((affiliate) => (
                <div key={affiliate.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white font-medium">{affiliate.name}</p>
                    <p className="text-sm text-gray-500">{affiliate.email}</p>
                  </div>
                  <StatusBadge status={affiliate.status} />
                </div>
              ))}
            </div>
          </section>

          {/* Pending Payouts */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Pending Payouts</h2>
              <p className="text-green-400 font-bold">
                ${((overview?.pending_payouts_cents || 0) / 100).toFixed(2)}
              </p>
            </div>
            <div className="space-y-3">
              {pendingPayouts.slice(0, 10).map((conversion: any) => (
                <div key={conversion.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white font-medium">{conversion.affiliate?.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(conversion.converted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-green-400 font-medium">
                    ${(conversion.commission_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            {pendingPayouts.length > 0 && (
              <Link
                href="/admin/payouts"
                className="block mt-4 text-center py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Process Payouts
              </Link>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color = 'white' }: { label: string; value: number; color?: 'white' | 'green' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color === 'green' ? 'text-green-400' : 'text-white'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    trial: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-green-500/20 text-green-400',
    expired: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.cancelled}`}>
      {status}
    </span>
  )
}
