import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'File must be an image or video' }, { status: 400 })
    }

    // Check file size based on type
    if (isImage) {
      // Images: 10MB max
      const maxImageSize = 10 * 1024 * 1024
      if (file.size > maxImageSize) {
        return NextResponse.json({ 
          error: `Image size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit` 
        }, { status: 400 })
      }
    } else if (isVideo) {
      // Videos: 50MB max
      const maxVideoSize = 50 * 1024 * 1024
      if (file.size > maxVideoSize) {
        return NextResponse.json({ 
          error: `Video size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit` 
        }, { status: 400 })
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileType = isImage ? 'images' : 'videos'
    const fileName = `${affiliate.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `community/${fileType}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

