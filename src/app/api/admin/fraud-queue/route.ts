import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = new URL(req.url).searchParams.get('status') || 'pending'

  const { data: flags } = await (supabaseAdmin as any)
    .from('fraud_flags')
    .select('*, affiliates(id, email, name), conversions(order_amount_cents, commission_cents)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ flags })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { flagId, resolution, notes, action } = await req.json()

  const { data: flag } = await (supabaseAdmin as any)
    .from('fraud_flags')
    .select('*')
    .eq('id', flagId)
    .single()
  
  if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

  await (supabaseAdmin as any).from('fraud_flags').update({
    status: 'resolved',
    resolution,
    resolution_notes: notes,
    reviewed_at: new Date().toISOString(),
  }).eq('id', flagId)

  if (action === 'suspend_affiliate' || resolution === 'account_suspended') {
    await (supabaseAdmin as any).from('affiliates').update({ status: 'suspended' }).eq('id', flag.affiliate_id)
    await (supabaseAdmin as any).from('conversions').update({ status: 'locked' }).eq('affiliate_id', flag.affiliate_id).in('status', ['pending', 'approved'])
  }

  if (action === 'block_ip' && flag.details?.ip) {
    await (supabaseAdmin as any).from('fraud_blocklist').upsert({
      block_type: 'ip',
      block_value: flag.details.ip,
      reason: resolution,
    })
  }

  return NextResponse.json({ success: true })
}


