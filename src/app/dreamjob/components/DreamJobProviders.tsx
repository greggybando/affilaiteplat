'use client'

import { UnlockProvider } from '@/contexts/UnlockContext'

export function DreamJobProviders({ children }: { children: React.ReactNode }) {
  return (
    <UnlockProvider>
      {children}
    </UnlockProvider>
  )
}

