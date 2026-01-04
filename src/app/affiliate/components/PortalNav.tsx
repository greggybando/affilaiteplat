'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PortalNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/affiliate', label: 'Dashboard' },
    { href: '/affiliate/leaderboard', label: 'Leaderboard' },
    { href: '/affiliate/watchlist', label: 'Watch List' },
    { href: '/affiliate/pods', label: 'Pods' },
    { href: '/affiliate/training', label: 'Training' },
    { href: '/affiliate/whats-working', label: "What's Working" },
    { href: '/affiliate/payouts', label: 'Payouts' },
    { href: '/affiliate/settings', label: 'Settings' },
  ]

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/affiliate' && pathname === '/affiliate')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-white border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <div className="ml-auto flex items-center gap-4 px-4">
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Log out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

