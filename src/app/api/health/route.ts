import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {}

  // Check environment variables
  checks.env = {
    status: 'ok',
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    checks.env = { status: 'error', message: 'NEXT_PUBLIC_SUPABASE_URL is missing' }
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    checks.env = { ...checks.env, message: (checks.env.message || '') + ' NEXT_PUBLIC_SUPABASE_ANON_KEY is missing' }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.env = { ...checks.env, message: (checks.env.message || '') + ' SUPABASE_SERVICE_ROLE_KEY is missing' }
  }

  // Test Supabase connection
  try {
    const { data, error } = await supabaseAdmin.from('products').select('id').limit(1)
    if (error) {
      checks.database = {
        status: 'error',
        message: `Connection failed: ${error.message}`,
      }
    } else {
      checks.database = {
        status: 'ok',
        message: 'Connected successfully',
      }
    }
  } catch (error: any) {
    checks.database = {
      status: 'error',
      message: `Connection error: ${error.message}`,
    }
  }

  // Check Stripe
  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'ok' : 'error',
    message: process.env.STRIPE_SECRET_KEY ? 'Configured' : 'STRIPE_SECRET_KEY is missing',
  }

  const allOk = Object.values(checks).every(check => check.status === 'ok')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 503 })
}







