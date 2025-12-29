import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      product_id,
      name,
      slug,
      variant_name,
      meta_title,
      meta_description,
      content,
    } = body

    if (!product_id || !name || !slug || !content) {
      return NextResponse.json(
        { error: 'Product, name, slug, and content are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists for this product
    const { data: existing } = await supabaseAdmin
      .from('landing_pages')
      .select('id')
      .eq('product_id', product_id)
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A page with this slug already exists for this product' },
        { status: 400 }
      )
    }

    // Create the landing page
    const { data: page, error: insertError } = await supabaseAdmin
      .from('landing_pages')
      .insert({
        product_id: product_id as string,
        name: name as string,
        slug: (slug as string).toLowerCase(),
        variant_name: (variant_name as string) || null,
        meta_title: (meta_title as string) || null,
        meta_description: (meta_description as string) || null,
        content: content as string,
        page_type: 'html' as const,
        is_active: true,
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating landing page:', insertError)
      return NextResponse.json(
        { error: 'Failed to create landing page' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, page })
  } catch (error) {
    console.error('Create page error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pages, error } = await supabaseAdmin
      .from('landing_pages')
      .select(`
        *,
        product:products (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Fetch pages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
