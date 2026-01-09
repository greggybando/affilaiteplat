'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PortalNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/affiliate', label: 'Dashboard' },
    { href: '/affiliate/leaderboard', label: 'Leaderboard' },
    { href: '/affiliate/training', label: 'Training' },
    { href: '/affiliate/whats-working', label: "What's Working" },
    { href: '/affiliate/payouts', label: 'Payouts' },
    { href: '/affiliate/settings', label: 'Settings' },
  ]

  return (
    <nav 
      className="border-b relative"
      style={{
        background: 'rgba(26,26,46,0.6)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255,255,255,0.1)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/affiliate' && pathname === '/affiliate')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-3 text-sm font-medium transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'text-cyan-400'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white'
                }`}
                style={isActive ? {
                  borderBottom: '2px solid rgba(34,211,238,0.8)',
                  textShadow: '0 0 10px rgba(34,211,238,0.5)'
                } : {}}
              >
                {item.label}
              </Link>
            )
          })}
          <div className="ml-auto flex items-center gap-4 px-4">
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="text-sm text-[rgba(255,255,255,0.6)] hover:text-cyan-400 transition-colors"
            >
              Log out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

