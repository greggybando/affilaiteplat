import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Initialize Supabase client for storage
const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch attachments for a specific parent (video/section/category)
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const parentId = searchParams.get('parentId')
    const parentType = searchParams.get('parentType') // 'video_id', 'section_id', 'category_id'
    const courseType = searchParams.get('courseType')

    if (!parentId || !parentType || !courseType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const { data: attachments, error } = await supabaseAdmin
      .from('course_attachments')
      .select('*')
      .eq('parent_id', parentId)
      .eq('parent_type', parentType)
      .eq('course_type', courseType)
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ attachments: attachments || [] })
  } catch (error: any) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Upload and attach a file
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const parentId = formData.get('parentId') as string
    const parentType = formData.get('parentType') as string // 'video_id', 'section_id', 'category_id'
    const courseType = formData.get('courseType') as string
    const displayName = formData.get('displayName') as string | null

    if (!file || !parentId || !parentType || !courseType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Validate file type (allow common document and image types)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/zip',
      'application/x-zip-compressed'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type ${file.type} not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, ZIP, text files.` 
      }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `course-attachments/${courseType}/${parentType}/${parentId}/${timestamp}-${sanitizedFileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseStorage.storage
      .from('course-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseStorage.storage
      .from('course-files')
      .getPublicUrl(filePath)

    // Determine attachment type based on parent type
    let attachmentType = 'video'
    if (parentType === 'section_id') attachmentType = 'section'
    if (parentType === 'category_id') attachmentType = 'category'

    // Get current max display_order for this parent
    const { data: existingAttachments } = await supabaseAdmin
      .from('course_attachments')
      .select('display_order')
      .eq('parent_id', parentId)
      .eq('parent_type', parentType)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existingAttachments && existingAttachments.length > 0
      ? (existingAttachments[0] as any).display_order + 1
      : 0

    // Create attachment record
    const { data: attachment, error: insertError } = await supabaseAdmin
      .from('course_attachments')
      .insert({
        course_type: courseType,
        attachment_type: attachmentType,
        parent_id: parentId,
        parent_type: parentType,
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        display_name: displayName || file.name,
        display_order: nextOrder
      } as any)
      .select()
      .single()

    if (insertError) {
      // If insert fails, try to delete the uploaded file
      await supabaseStorage.storage.from('course-files').remove([filePath])
      throw insertError
    }

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove an attachment
export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { attachmentId } = await request.json()

    if (!attachmentId) {
      return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 })
    }

    // Get attachment to find file path
    const { data: attachment, error: fetchError } = await supabaseAdmin
      .from('course_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete from storage
    await supabaseStorage.storage
      .from('course-files')
      .remove([(attachment as any).file_path])

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('course_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

