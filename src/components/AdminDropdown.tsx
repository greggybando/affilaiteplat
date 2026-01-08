'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Settings, ChevronDown } from 'lucide-react'

interface AdminDropdownProps {
  isAdmin: boolean
}

export function AdminDropdown({ isAdmin }: AdminDropdownProps) {
  // Only show for admins
  if (!isAdmin) return null
  
  const [isOpen, setIsOpen] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Component is only rendered when user is admin, so always show button

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setButtonPosition({
          top: rect.bottom + window.scrollY + 8,
          right: window.innerWidth - rect.right
        })
      }
    }

    if (isOpen) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const dropdownContent = isOpen && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-slate-900 rounded-xl border-2 border-cyan-500/50 shadow-2xl overflow-hidden"
      style={{
        top: `${buttonPosition.top}px`,
        right: `${buttonPosition.right}px`,
        width: '280px',
        zIndex: 99999,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 211, 238, 0.3)'
      }}
    >
      <div className="p-2">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 mb-1">
          Course Management
        </div>
        <Link
          href="/admin/courses"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Manage Courses
        </Link>
        <Link
          href="/checkpoints-admin"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Checkpoints
        </Link>
        <Link
          href="/admin/checkpoints/review"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Review Queue
        </Link>
        <Link
          href="/admin/unlock-rules"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Unlock Rules
        </Link>

        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 mb-1 mt-2">
          Platform Management
        </div>
        <Link
          href="/admin"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/affiliates"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Affiliates
        </Link>
        <Link
          href="/admin/products"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Products
        </Link>
        <Link
          href="/admin/pages"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Landing Pages
        </Link>
        <Link
          href="/admin/payouts"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Payouts
        </Link>
        <Link
          href="/admin/bounties"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Bounties
        </Link>

        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 mb-1 mt-2">
          Community
        </div>
        <Link
          href="/community/admin"
          onClick={() => setIsOpen(false)}
          className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          Community Admin
        </Link>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-10 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/50 rounded-lg text-purple-300 font-bold text-base transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 flex items-center gap-2"
        style={{
          textShadow: '0 0 8px rgba(192, 132, 252, 0.8)',
          boxShadow: '0 0 20px rgba(192, 132, 252, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <Settings className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 4px rgba(192, 132, 252, 0.8))' }} />
        Admin
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownContent}
    </>
  )
}
