import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET!
export const COOKIE_NAME = 'affiliate_token'

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
    const allCookies = cookieStore.getAll()
    
    // Debug: log all cookies to see what's available
    console.log('🔍 getCurrentAffiliate - All cookies:', allCookies.map(c => c.name))
    
    const token = cookieStore.get(COOKIE_NAME)?.value
    
    console.log('🔍 getCurrentAffiliate - token found:', !!token, 'token length:', token?.length || 0)
    
    if (!token) {
      console.log('❌ No token found in cookies')
      return null
    }

    const payload = verifyToken(token)
    console.log('🔐 Token valid:', !!payload, 'payload:', payload ? { affiliateId: payload.affiliateId, email: payload.email } : null)
    
    if (!payload) {
      console.log('❌ Token verification failed')
      return null
    }

    const { data: affiliate, error } = await supabaseAdmin
      .from('affiliates')
      .select('id, email, name, avatar_name, avatar_url, role, onboarding_completed, status, is_admin')
      .eq('id', payload.affiliateId)
      .single()

    if (error || !affiliate) {
      console.log('❌ Affiliate not found in database:', error?.message || 'no data')
      return null
    }

    console.log('✅ Affiliate found:', {
      id: (affiliate as any).id,
      email: (affiliate as any).email
    })
    return affiliate as any
  } catch (error) {
    console.error('❌ Error in getCurrentAffiliate:', error)
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  const token = getAuthCookie()
  if (!token) return false
  const payload = verifyToken(token)
  if (!payload) return false
  return payload.email === process.env.ADMIN_EMAIL
}

export function generateTrackingCode(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
