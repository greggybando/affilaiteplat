export function StatsCards({ stats, affiliate }: { stats: any; affiliate?: any }) {
  // Extract stats from FirstPromoter API (all values in cents)
  const clicks = stats?.total_clicks || 0
  const sales = stats?.sales_count || 0
  const conversionRate = clicks > 0 ? ((sales / clicks) * 100).toFixed(1) : '0.0'
  const revenue = (stats?.revenue_cents || 0) / 100
  const commissions = (stats?.commissions_cents || 0) / 100
  const paidOut = (stats?.paid_cents || 0) / 100

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
        <div 
          className="mb-4 rounded-xl p-4 flex items-center gap-2 border relative overflow-hidden"
          style={{
            background: 'rgba(251,146,60,0.1)',
            borderColor: 'rgba(251,146,60,0.3)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(251,146,60,0.2)'
          }}
        >
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-white font-medium">+{boostPercent}% Commission Boost Active</p>
            <p className="text-sm text-[rgba(255,255,255,0.7)]">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</p>
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
        label="Sales"
        value={sales.toLocaleString()}
        sublabel={`${conversionRate}% rate`}
        color="gray"
      />
      <StatCard
        label="Commissions Earned"
        value={`$${commissions.toFixed(2)}`}
        sublabel="Paid out after 30 days"
        color="cyan"
      />
      <StatCard
        label="Paid Out"
        value={`$${paidOut.toFixed(2)}`}
        sublabel="Lifetime payouts"
        color="cyan"
      />
      <StatCard
        label="Total Revenue Generated"
        value={`$${revenue.toFixed(2)}`}
        sublabel="Total sales x price of sale"
        color="cyan"
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
  color?: 'gray' | 'yellow' | 'cyan' | 'green'
}) {
  const colorStyles = {
    gray: {
      background: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.1)',
      textColor: 'text-white',
      glow: 'none'
    },
    yellow: {
      background: 'rgba(251,191,36,0.1)',
      borderColor: 'rgba(251,191,36,0.3)',
      textColor: 'text-yellow-400',
      glow: '0 0 15px rgba(251,191,36,0.2)'
    },
    cyan: {
      background: 'rgba(34,211,238,0.1)',
      borderColor: 'rgba(34,211,238,0.3)',
      textColor: 'text-cyan-400',
      glow: '0 0 15px rgba(34,211,238,0.3)'
    },
    green: {
      background: 'rgba(34,197,94,0.1)',
      borderColor: 'rgba(34,197,94,0.3)',
      textColor: 'text-green-400',
      glow: '0 0 15px rgba(34,197,94,0.3)'
    },
  }

  const style = colorStyles[color]

  return (
    <div 
      className={`rounded-xl border p-4 relative overflow-hidden`}
      style={{
        background: style.background,
        borderColor: style.borderColor,
        backdropFilter: 'blur(10px)',
        boxShadow: style.glow
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      <p className="text-sm text-[rgba(255,255,255,0.6)] relative z-10">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${style.textColor} relative z-10`}>{value}</p>
      {sublabel && <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1 relative z-10">{sublabel}</p>}
    </div>
  )
}
