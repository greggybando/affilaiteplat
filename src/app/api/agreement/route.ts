import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agreement } = await (supabaseAdmin as any)
    .from('affiliate_agreements')
    .select('*')
    .eq('is_current', true)
    .single()
  
  if (!agreement) return NextResponse.json({ error: 'No agreement found' }, { status: 404 })

  const { data: acceptance } = await (supabaseAdmin as any)
    .from('agreement_acceptances')
    .select('accepted_at')
    .eq('affiliate_id', affiliate.id)
    .eq('agreement_id', agreement.id)
    .single()

  return NextResponse.json({
    agreement: { id: agreement.id, version: agreement.version, title: agreement.title, content: agreement.content },
    acceptance: acceptance ? { accepted: true, acceptedAt: acceptance.accepted_at } : { accepted: false },
  })
}

export async function POST(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agreementId } = await req.json()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'

  const { data: existing } = await (supabaseAdmin as any)
    .from('agreement_acceptances')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('agreement_id', agreementId)
    .single()
  
  if (existing) return NextResponse.json({ success: true, alreadyAccepted: true })

  await (supabaseAdmin as any).from('agreement_acceptances').insert({
    affiliate_id: affiliate.id,
    agreement_id: agreementId,
    ip_address: ip,
    user_agent: userAgent,
  })

  return NextResponse.json({ success: true })
}

