'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // On mount and route change, ensure token is sent as Authorization header
    const token = localStorage.getItem('affiliate_token')
    
    if (token) {
      // Token exists in localStorage, ensure it's available
      // The middleware will read it from the Authorization header
      console.log('✅ AuthProvider: Token found in localStorage')
    } else {
      console.log('⚠️ AuthProvider: No token in localStorage')
    }
  }, [pathname])

  return <>{children}</>
}




