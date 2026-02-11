import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 2MB for favicon/thumbnail)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be less than 2MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `product-thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if bucket exists, create if not
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const avatarsBucket = buckets?.find((b) => b.name === 'avatars')
    
    if (!avatarsBucket) {
      return NextResponse.json(
        { error: 'Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.' },
        { status: 500 }
      )
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading thumbnail:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

