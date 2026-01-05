'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { name: 'Content', href: '/mindset/content' },
  { name: 'Forum', href: '/mindset/forum' },
]

export function MindsetNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-slate-900/60 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href) || 
              (tab.href === '/mindset/content' && pathname.startsWith('/mindset/module'))
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`px-6 py-3 text-sm font-semibold transition-all relative ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
              >
                {tab.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
