/**
 * Rate Limiting for API Routes
 * 
 * Uses in-memory sliding window for now.
 * For production at scale, replace with Upstash Redis.
 * 
 * Usage in API route:
 * ```
 * import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
 * 
 * export async function POST(request: NextRequest) {
 *   const { success, limit, remaining, reset } = await rateLimit(request)
 *   if (!success) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429, headers: getRateLimitHeaders(limit, remaining, reset) }
 *     )
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (works for single instance, use Redis for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const WINDOW_MS = 60 * 1000 // 1 minute window
const MAX_REQUESTS_ANONYMOUS = 60 // 60 requests/min for anonymous
const MAX_REQUESTS_AUTHENTICATED = 200 // 200 requests/min for authenticated

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    })
  }, 5 * 60 * 1000)
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from cookie (for authenticated users)
  const token = request.cookies.get('affiliate_token')?.value
  if (token) {
    // Use a hash of the token as identifier
    return `user:${hashCode(token)}`
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `ip:${ip}`
}

/**
 * Simple hash function for tokens
 */
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

/**
 * Check rate limit for a request
 */
export async function rateLimit(
  request: NextRequest,
  options?: {
    maxRequests?: number
    windowMs?: number
  }
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const clientId = getClientId(request)
  const isAuthenticated = clientId.startsWith('user:')
  
  const limit = options?.maxRequests ?? (isAuthenticated ? MAX_REQUESTS_AUTHENTICATED : MAX_REQUESTS_ANONYMOUS)
  const windowMs = options?.windowMs ?? WINDOW_MS
  
  const now = Date.now()
  const entry = rateLimitStore.get(clientId)
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    rateLimitStore.set(clientId, { count: 1, resetAt })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt
    }
  }
  
  // Increment count
  entry.count++
  
  if (entry.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt
    }
  }
  
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetAt
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): HeadersInit {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
    'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
  }
}

/**
 * Stricter rate limit for sensitive operations (login, signup, password reset)
 */
export async function strictRateLimit(
  request: NextRequest
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  return rateLimit(request, {
    maxRequests: 10, // 10 attempts per minute
    windowMs: 60 * 1000
  })
}

/**
 * Rate limit for AI operations (more expensive)
 */
export async function aiRateLimit(
  request: NextRequest
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  return rateLimit(request, {
    maxRequests: 20, // 20 AI requests per minute
    windowMs: 60 * 1000
  })
}

