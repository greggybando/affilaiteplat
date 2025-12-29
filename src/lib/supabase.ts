import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Types for our database
export type Affiliate = {
  id: string
  email: string
  password_hash: string
  name: string
  payout_method: 'paypal' | 'stripe' | null
  paypal_email: string | null
  stripe_account_id: string | null
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  trial_started_at: string
  trial_ends_at: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_started_at: string | null
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  commission_percent: number
  commission_fixed_cents: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  webhook_secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LandingPage = {
  id: string
  product_id: string
  name: string
  slug: string
  page_type: 'html' | 'react'
  content: string
  meta_title: string | null
  meta_description: string | null
  variant_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AffiliateLink = {
  id: string
  affiliate_id: string
  landing_page_id: string
  tracking_code: string
  custom_slug: string | null
  created_at: string
}

export type Click = {
  id: string
  affiliate_link_id: string
  ip_address: string | null
  user_agent: string | null
  referer: string | null
  visitor_id: string | null
  clicked_at: string
}

export type Conversion = {
  id: string
  affiliate_id: string
  affiliate_link_id: string | null
  product_id: string | null
  stripe_payment_intent_id: string
  stripe_customer_email: string | null
  order_amount_cents: number
  commission_cents: number
  status: 'pending' | 'approved' | 'locked' | 'paid' | 'refunded'
  visitor_id: string | null
  attributed_click_id: string | null
  converted_at: string
  approved_at: string | null
  paid_at: string | null
}

export type AffiliateStats = {
  affiliate_id: string
  email: string
  name: string
  subscription_status: string
  trial_ends_at: string
  total_links: number
  total_clicks: number
  total_conversions: number
  pending_cents: number
  approved_cents: number
  locked_cents: number
  paid_cents: number
}

// Validate environment variables
function validateSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in environment variables')
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables')
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  }

  return { url, anonKey, serviceKey }
}

// Client-side Supabase client
export let supabase: ReturnType<typeof createClient>
try {
  const { url, anonKey } = validateSupabaseConfig()
  supabase = createClient(url, anonKey)
} catch (error) {
  console.error('Supabase client initialization error:', error)
  // Create a dummy client to prevent crashes, but it won't work
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
}

// Server-side Supabase client (for API routes and server components)
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  try {
    const { url, serviceKey } = validateSupabaseConfig()
    return createServerClient(url, serviceKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    })
  } catch (error) {
    console.error('Supabase server client initialization error:', error)
    // Return a dummy client to prevent crashes
    return createServerClient('https://placeholder.supabase.co', 'placeholder-key', {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    })
  }
}

// Admin client with service role (bypasses RLS)
export let supabaseAdmin: ReturnType<typeof createClient>
try {
  const { url, serviceKey } = validateSupabaseConfig()
  supabaseAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
} catch (error) {
  console.error('Supabase admin client initialization error:', error)
  // Create a dummy client to prevent crashes, but it won't work
  supabaseAdmin = createClient('https://placeholder.supabase.co', 'placeholder-key')
}

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('products').select('id').limit(1)
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error: any) {
    console.error('Supabase connection test error:', error)
    return { success: false, error: error.message }
  }
}
