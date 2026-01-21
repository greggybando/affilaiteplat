import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // Redirect expired or cancelled users to resubscribe page
  if (affiliate.status === 'expired' || affiliate.status === 'cancelled') {
    redirect('/resubscribe')
  }

  return <>{children}</>
}

