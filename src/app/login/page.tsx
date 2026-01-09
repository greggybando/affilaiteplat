'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const data = { email, password }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Login failed')
      }

      if (result.success) {
        // Set cookie client-side as backup (in case server-set cookie fails)
        if (result.token) {
          const isProduction = window.location.protocol === 'https:'
          const secureFlag = isProduction ? 'secure;' : ''
          document.cookie = `affiliate_token=${result.token}; path=/; max-age=86400; ${secureFlag} samesite=lax`
        }
        
        // Wait for cookie to be processed, then redirect
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Use window.location.href for full page reload
        // The API will return the correct redirect path based on onboarding status
        window.location.href = result.redirectTo || '/dashboard'
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative" style={{
              animation: 'lightning 4s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.7))'
            }}>
              <Zap className="w-12 h-12 text-cyan-400" fill="currentColor" style={{
                filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 1))'
              }} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{
                textShadow: '0 0 20px rgba(34, 211, 238, 0.9), 0 0 40px rgba(6, 182, 212, 0.8)',
                letterSpacing: '0.05em',
                fontWeight: 700
              }}>
                LIFE DESIGN
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[rgba(255,255,255,0.6)]">Sign in to continue your journey</p>
        </div>

        <style jsx>{`
          @keyframes lightning {
            0%, 90%, 100% { opacity: 1; transform: scale(1); }
            5%, 10% { opacity: 0.3; transform: scale(0.95); }
            7.5% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Glassmorphic card */}
          <div 
            className="rounded-2xl p-8 space-y-6 border relative overflow-hidden"
            style={{
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255,255,255,0.1)',
              boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)'
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
            
            <div className="relative z-10">
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="you@example.com"
              />
            </div>

            <div className="relative z-10">
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div 
              className="rounded-lg p-4 text-red-400 text-sm border"
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderColor: 'rgba(239,68,68,0.5)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
              color: '#0f0f1a'
            }}
          >
            <span className="relative z-10 font-bold">{isLoading ? 'Signing in...' : 'Sign In'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          </button>
        </form>

        <p className="text-center mt-6 text-[rgba(255,255,255,0.6)]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
