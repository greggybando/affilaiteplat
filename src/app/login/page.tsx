'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Debug: Log when component mounts
  if (typeof window !== 'undefined') {
    console.log('🔍 Login page loaded')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('🚀 Form submitted!')
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    console.log('📧 Email:', email ? 'provided' : 'missing')
    console.log('🔑 Password:', password ? 'provided' : 'missing')

    const data = { email, password }

    try {
      console.log('🔄 Attempting login...', { email, hasPassword: !!password })
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      console.log('📥 Login response status:', res.status)
      const result = await res.json()
      console.log('📥 Login response:', result)

      if (!res.ok) {
        throw new Error(result.error || 'Login failed')
      }

      if (result.success) {
        console.log('✅ Login successful')
        
        // Set cookie client-side as backup (in case server-set cookie fails)
        if (result.token) {
          const isProduction = window.location.protocol === 'https:'
          const secureFlag = isProduction ? 'secure;' : ''
          document.cookie = `affiliate_token=${result.token}; path=/; max-age=86400; ${secureFlag} samesite=lax`
          console.log('🍪 Cookie set client-side as backup')
        }
        
        // The cookie is also set by the server in the response
        // We need to wait for the browser to process it
        // Then redirect - the cookie will be sent with the redirect request
        console.log('⏳ Waiting for cookie to be processed...')
        await new Promise(resolve => setTimeout(resolve, 300))
        
        console.log('🔄 Redirecting to portal...')
        // Use window.location.href for full page reload
        // This ensures the cookie is sent with the request
        window.location.href = '/portal'
      }
    } catch (err: any) {
      console.error('❌ Login error:', err)
      setError(err.message || 'Failed to login. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your affiliate dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-900 rounded-xl p-6 space-y-5 border border-gray-800">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-green-400 hover:text-green-300">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
