/**
 * Calculate individual affiliate weight class based on sales over past 30 days
 */
export async function calculateIndividualWeightClass(
  affiliateId: string,
  supabaseClient: any
): Promise<{ level: number; name: string; sales: number }> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: conversions } = await supabaseClient
    .from('conversions')
    .select('order_amount_cents, status')
    .eq('affiliate_id', affiliateId)
    .gte('converted_at', thirtyDaysAgo.toISOString())
    .neq('status', 'refunded')

  const totalSales = (conversions || []).reduce(
    (sum: number, conv: any) => sum + (conv.order_amount_cents || 0),
    0
  )

  const salesCount = totalSales / 100 // Convert cents to dollars

  // Individual levels
  if (salesCount >= 201) {
    return { level: 4, name: 'Gigachad', sales: salesCount }
  } else if (salesCount >= 101) {
    return { level: 3, name: 'Man in the Arena', sales: salesCount }
  } else if (salesCount >= 11) {
    return { level: 2, name: 'Young Buck with Motion', sales: salesCount }
  } else {
    return { level: 1, name: 'Ambitious Beginner', sales: salesCount }
  }
}

/**
 * Calculate pod weight class based on total sales over past 30 days (combined pod sales)
 */
export async function calculatePodWeightClass(
  podId: string,
  supabaseClient: any
): Promise<{ level: number; name: string; sales: number }> {
  // Get all pod members
  const { data: members } = await supabaseClient
    .from('pod_members')
    .select('affiliate_id')
    .eq('pod_id', podId)
    .eq('status', 'accepted')

  if (!members || members.length === 0) {
    return { level: 1, name: 'Startup Squad', sales: 0 }
  }

  const affiliateIds = members.map((m: any) => m.affiliate_id)

  // Get total sales for all members over past 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: conversions } = await supabaseClient
    .from('conversions')
    .select('order_amount_cents, status')
    .in('affiliate_id', affiliateIds)
    .gte('converted_at', thirtyDaysAgo.toISOString())
    .neq('status', 'refunded')

  const totalSales = (conversions || []).reduce(
    (sum: number, conv: any) => sum + (conv.order_amount_cents || 0),
    0
  )

  const salesCount = totalSales / 100 // Convert cents to dollars

  // Pod levels (different from individual levels)
  if (salesCount >= 401) {
    return { level: 4, name: 'Dynasty', sales: salesCount }
  } else if (salesCount >= 151) {
    return { level: 3, name: 'War Machine', sales: salesCount }
  } else if (salesCount >= 31) {
    return { level: 2, name: 'Wolf Pack', sales: salesCount }
  } else {
    return { level: 1, name: 'Startup Squad', sales: salesCount }
  }
}

export function getWeightClassBadgeColor(level: number): string {
  switch (level) {
    case 4:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 3:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 2:
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export function getWeightClassIcon(level: number): string {
  switch (level) {
    case 4:
      return '👑'
    case 3:
      return '⚔️'
    case 2:
      return '🔥'
    default:
      return '🌱'
  }
}

