import type { AffiliateStats } from '@/lib/supabase'

export function StatsCards({ stats, affiliate }: { stats: AffiliateStats | null; affiliate?: any }) {
  const clicks = stats?.total_clicks || 0
  const conversions = stats?.total_conversions || 0
  const conversionRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0'
  const pending = (stats?.pending_cents || 0) / 100
  const approved = (stats?.approved_cents || 0) / 100
  const paid = (stats?.paid_cents || 0) / 100

  // Check for active commission boost
  const boostPercent = affiliate?.commission_boost_percent || 0
  const boostExpiresAt = affiliate?.commission_boost_expires_at
  const hasActiveBoost = boostPercent > 0 && boostExpiresAt && new Date(boostExpiresAt) > new Date()
  const daysLeft = hasActiveBoost
    ? Math.ceil((new Date(boostExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <>
      {hasActiveBoost && (
        <div className="mb-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-lg p-4 flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-white font-medium">+{boostPercent}% Commission Boost Active</p>
            <p className="text-sm text-gray-300">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        label="Total Clicks"
        value={clicks.toLocaleString()}
        color="gray"
      />
      <StatCard
        label="Conversions"
        value={conversions.toLocaleString()}
        sublabel={`${conversionRate}% rate`}
        color="gray"
      />
      <StatCard
        label="Pending"
        value={`$${pending.toFixed(2)}`}
        sublabel="Awaiting approval"
        color="yellow"
      />
      <StatCard
        label="Ready to Pay"
        value={`$${approved.toFixed(2)}`}
        sublabel="Available for payout"
        color="green"
      />
      <StatCard
        label="Total Earned"
        value={`$${paid.toFixed(2)}`}
        sublabel="Lifetime earnings"
        color="green"
      />
    </div>
    </>
  )
}

function StatCard({
  label,
  value,
  sublabel,
  color = 'gray',
}: {
  label: string
  value: string
  sublabel?: string
  color?: 'gray' | 'yellow' | 'green'
}) {
  const colorClasses = {
    gray: 'bg-gray-800/50 border-gray-700',
    yellow: 'bg-yellow-500/10 border-yellow-500/30',
    green: 'bg-green-500/10 border-green-500/30',
  }

  const valueClasses = {
    gray: 'text-white',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClasses[color]}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  )
}
