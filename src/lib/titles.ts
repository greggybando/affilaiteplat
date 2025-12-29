/**
 * Title system for pod battles
 */

export type TitleSlug =
  | 'undefeated'
  | 'giant_killer'
  | 'ironman'
  | 'underdog'
  | 'defender'

export type Title = {
  slug: TitleSlug
  name: string
  description: string
  isPermanent: boolean
  icon: string
}

export const TITLES: Record<TitleSlug, Title> = {
  undefeated: {
    slug: 'undefeated',
    name: 'Undefeated',
    description: 'Currently on a win streak',
    isPermanent: false,
    icon: '🔥',
  },
  giant_killer: {
    slug: 'giant_killer',
    name: 'Giant Killer',
    description: 'Beat a pod 2+ levels above yours',
    isPermanent: true,
    icon: '⚔️',
  },
  ironman: {
    slug: 'ironman',
    name: 'Ironman',
    description: '5 battle win streak',
    isPermanent: true,
    icon: '💪',
  },
  underdog: {
    slug: 'underdog',
    name: 'Underdog',
    description: 'Won a battle as lower weight class',
    isPermanent: true,
    icon: '🏆',
  },
  defender: {
    slug: 'defender',
    name: 'Defender',
    description: 'Successfully defended 3 challenges',
    isPermanent: true,
    icon: '🛡️',
  },
}

export async function awardTitle(
  affiliateId: string,
  titleSlug: TitleSlug,
  supabaseClient: any
): Promise<void> {
  const title = TITLES[titleSlug]
  if (!title) return

  // Check if already has this title
  const { data: existing } = await supabaseClient
    .from('affiliate_titles')
    .select('id')
    .eq('affiliate_id', affiliateId)
    .eq('title_slug', titleSlug)
    .maybeSingle()

  if (!existing) {
    await (supabaseClient.from('affiliate_titles') as any).insert({
      affiliate_id: affiliateId,
      title_slug: titleSlug,
      is_permanent: title.isPermanent,
    })
  }
}

export async function revokeTitle(
  affiliateId: string,
  titleSlug: TitleSlug,
  supabaseClient: any
): Promise<void> {
  const title = TITLES[titleSlug]
  if (!title) return

  // Only revoke non-permanent titles
  if (!title.isPermanent) {
    await supabaseClient
      .from('affiliate_titles')
      .delete()
      .eq('affiliate_id', affiliateId)
      .eq('title_slug', titleSlug)
  }
}




