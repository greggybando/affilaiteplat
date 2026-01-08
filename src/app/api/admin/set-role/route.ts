import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Set a user's role to admin (only works if you know the secret)
export async function POST(request: NextRequest) {
  try {
    const { email, secret } = await request.json()
    
    // Simple secret check - change this in production
    if (secret !== 'make-me-admin-2024') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    
    // Update the user's role
    const { data, error } = await (supabaseAdmin as any)
      .from('affiliates')
      .update({ role: 'admin' })
      .eq('email', email)
      .select('id, email, role')
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Set ${email} as admin`,
      user: data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Check current user's admin status
export async function GET() {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }
    
    return NextResponse.json({
      email: (affiliate as any).email,
      role: (affiliate as any).role,
      is_admin: (affiliate as any).is_admin,
      isAdminByRole: (affiliate as any).role === 'admin'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

