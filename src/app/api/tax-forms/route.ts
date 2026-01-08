import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()

  const { data: form } = await (supabaseAdmin as any)
    .from('affiliate_tax_forms')
    .select('id, form_type, submitted_at')
    .eq('affiliate_id', affiliate.id)
    .eq('tax_year', year)
    .eq('is_valid', true)
    .single()
  
  const { data: earnings } = await (supabaseAdmin as any)
    .from('affiliate_annual_earnings')
    .select('total_paid_cents')
    .eq('affiliate_id', affiliate.id)
    .eq('tax_year', year)
    .single()

  const total = earnings?.total_paid_cents || 0
  let status = 'not_required'
  if (form) status = 'submitted'
  else if (total >= 60000) status = 'required'
  else if (total >= 50000) status = 'recommended'

  return NextResponse.json({ status, hasValidForm: !!form, earnings: { totalCents: total, threshold: 60000 } })
}

export async function POST(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const year = new Date().getFullYear()

  // Invalidate existing
  await (supabaseAdmin as any)
    .from('affiliate_tax_forms')
    .update({ is_valid: false, invalidated_at: new Date().toISOString() })
    .eq('affiliate_id', affiliate.id)
    .eq('tax_year', year)

  const record: any = {
    affiliate_id: affiliate.id,
    form_type: body.formType,
    legal_name: body.legalName,
    address_line1: body.addressLine1,
    address_line2: body.addressLine2 || null,
    city: body.city,
    postal_code: body.postalCode,
    certification_confirmed: body.certificationConfirmed,
    electronic_signature: body.electronicSignature,
    ip_address: ip,
    user_agent: userAgent,
    tax_year: year,
  }

  if (body.formType === 'w9') {
    record.business_name = body.businessName || null
    record.tax_classification = body.taxClassification
    record.tax_id_type = body.taxIdType
    record.tax_id_last_four = body.taxId.replace(/\D/g, '').slice(-4)
    record.state = body.state
    record.country = 'US'
  } else {
    record.country = body.country
    record.state = body.stateProvince || null
    record.tax_id_type = 'foreign'
    record.foreign_tax_id = body.foreignTaxId || null
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('affiliate_tax_forms')
    .insert(record)
    .select('id')
    .single()
  
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ success: true, formId: data.id })
}


