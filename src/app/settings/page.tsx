import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <SettingsClient affiliate={affiliate as any} />
    </div>
  )
}






