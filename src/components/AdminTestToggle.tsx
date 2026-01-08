'use client'

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight } from 'lucide-react'

export function AdminTestToggle() {
  const [isAdminMode, setIsAdminMode] = useState(true) // Default to admin mode ON

  useEffect(() => {
    // Check cookie on mount
    const checkAdminMode = () => {
      const cookies = document.cookie.split(';')
      const adminModeCookie = cookies.find(c => c.trim().startsWith('admin_mode_toggle='))
      // If cookie exists and is 'false', admin mode is OFF (normal user)
      // If cookie doesn't exist or is 'true', admin mode is ON (admin)
      const adminMode = adminModeCookie ? adminModeCookie.split('=')[1] !== 'false' : true
      setIsAdminMode(adminMode)
    }
    checkAdminMode()
  }, [])

  const toggleAdminMode = async () => {
    const newMode = !isAdminMode
    setIsAdminMode(newMode)
    
    // Set cookie (expires in 7 days)
    // 'true' = admin mode ON, 'false' = admin mode OFF (normal user)
    const expires = new Date()
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000)
    document.cookie = `admin_mode_toggle=${newMode}; expires=${expires.toUTCString()}; path=/`
    
    // Also set in localStorage for client components
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_mode_toggle', newMode.toString())
    }
    
    // Reload to apply changes
    window.location.reload()
  }

  return (
    <button
      onClick={toggleAdminMode}
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-sm"
      title={isAdminMode ? "Admin Mode ON - You are admin. Click to turn OFF and test as normal user." : "Admin Mode OFF - You appear as normal user. Click to turn ON."}
    >
      {isAdminMode ? (
        <>
          <ToggleRight className="w-4 h-4 text-green-400" />
          <span className="text-green-400">Admin: ON</span>
        </>
      ) : (
        <>
          <ToggleLeft className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400">Admin: OFF</span>
        </>
      )}
    </button>
  )
}

// Helper function to check if admin mode is active (for client components)
export function isAdminModeActive(): boolean {
  if (typeof window === 'undefined') return true // Default to admin on server
  // Check cookie first, then localStorage as fallback
  const cookies = document.cookie.split(';')
  const adminModeCookie = cookies.find(c => c.trim().startsWith('admin_mode_toggle='))
  if (adminModeCookie) {
    return adminModeCookie.split('=')[1] !== 'false'
  }
  // Check localStorage
  const stored = localStorage.getItem('admin_mode_toggle')
  return stored !== 'false' // Default to true if not set
}

