'use client'

import { FirstPromoterLinks } from './FirstPromoterLinks'

type SimpleReferralLinkProps = {
  refId: string | null
}

export function SimpleReferralLink({ refId }: SimpleReferralLinkProps) {
  return <FirstPromoterLinks refId={refId} />
}



