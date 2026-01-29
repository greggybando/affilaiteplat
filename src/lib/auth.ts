import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET!
export const COOKIE_NAME = 'affiliate_token'

// ============================================
// AUTH CACHE - Reduces DB queries by ~80%
// ============================================
interface CacheEntry {
  data: any
  expires: number
}

// In-memory cache with 5-minute TTL
const affiliateCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Periodically clean expired entries (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    affiliateCache.forEach((entry, key) => {
      if (entry.expires < now) {
        affiliateCache.delete(key)
      }
    })
  }, 10 * 60 * 1000)
}

// Invalidate cache for a specific user (call after profile updates)
export function invalidateAuthCache(affiliateId: string) {
  affiliateCache.delete(affiliateId)
}

// ============================================
// CORE AUTH FUNCTIONS
// ============================================

export type TokenPayload = {
  affiliateId: string
  email: string
  isAdmin?: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function getAuthCookie(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME)
}

export async function getCurrentAffiliate() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    
    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // Check cache first - avoids DB query on every request
    const cached = affiliateCache.get(payload.affiliateId)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    // DB lookup (only on cache miss)
    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .select('id, email, name, avatar_name, avatar_url, role, onboarding_completed, status, is_admin, banned, group_chat_muted')
      .eq('id', payload.affiliateId)
      .single()

    if (error || !affiliate) {
      return null
    }

    // Check if user is banned
    if ((affiliate as any).banned === true) {
      return null
    }

    // Cache the result
    affiliateCache.set(payload.affiliateId, {
      data: affiliate,
      expires: Date.now() + CACHE_TTL
    })

    return affiliate as any
  } catch (error) {
    console.error('Error in getCurrentAffiliate:', error)
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  const token = getAuthCookie()
  if (!token) return false
  
  const payload = verifyToken(token)
  if (!payload) return false
  
  // Hardcoded admin emails (most reliable check - no DB needed)
  const adminEmails = [
    process.env.ADMIN_EMAIL,
    'grant@reelstacks.ai'
  ].filter(Boolean)
  
  if (adminEmails.includes(payload.email)) {
    return true
  }
  
  // Check cache for role
  const cached = affiliateCache.get(payload.affiliateId)
  if (cached && cached.expires > Date.now()) {
    return cached.data?.role === 'admin'
  }
  
  // Fallback: Check database role
  try {
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('role')
      .eq('id', payload.affiliateId)
      .single()
    
    if ((affiliate as any)?.role === 'admin') {
      return true
    }
  } catch (e) {
    // Silent fail
  }
  
  return false
}

export function generateTrackingCode(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
