import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

// GET - Fetch attachments for a video (public access)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')
    const courseType = searchParams.get('courseType') // 'mindset' or 'dreamjob'

    if (!videoId || !courseType) {
      return NextResponse.json({ error: 'Missing videoId or courseType' }, { status: 400 })
    }

    // Fetch attachments for this video (public - all users can view)
    const { data: attachments, error } = await supabaseAdmin
      .from('course_attachments')
      .select('id, file_name, file_url, file_size, file_type, display_name, display_order, created_at')
      .eq('parent_id', videoId)
      .eq('parent_type', 'video_id')
      .eq('course_type', courseType)
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ attachments: attachments || [] })
  } catch (error: any) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST - Upload attachment for a video
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const videoId = formData.get('videoId') as string
    const courseType = formData.get('courseType') as string // 'mindset' or 'dreamjob'

    if (!file || !videoId || !courseType) {
      return NextResponse.json({ error: 'Missing file, videoId, or courseType' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Validate file type
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
        error: `File type not allowed. Allowed: PDF, Word, Excel, PowerPoint, Images, ZIP, Text files.` 
      }, { status: 400 })
    }

    // Check if bucket exists, create if not
    const { data: buckets } = await supabaseStorage.storage.listBuckets()
    const courseFilesBucket = buckets?.find((b) => b.name === 'course-files')
    
    if (!courseFilesBucket) {
      const { data: newBucket, error: createError } = await supabaseStorage.storage.createBucket('course-files', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please create a "course-files" bucket in Supabase Storage.' 
        }, { status: 500 })
      }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${courseType}/video/${videoId}/${timestamp}-${sanitizedFileName}`

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

    // Get current max display_order for this video
    const { data: existingAttachments } = await supabaseAdmin
      .from('course_attachments')
      .select('display_order')
      .eq('parent_id', videoId)
      .eq('parent_type', 'video_id')
      .eq('course_type', courseType)
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
        attachment_type: 'video',
        parent_id: videoId,
        parent_type: 'video_id',
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        display_name: file.name,
        display_order: nextOrder
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting attachment:', insertError)
      // Try to delete uploaded file if metadata insertion fails
      await supabaseStorage.storage.from('course-files').remove([filePath])
      return NextResponse.json({ error: 'Failed to save attachment metadata' }, { status: 500 })
    }

    return NextResponse.json({ success: true, attachment })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// DELETE - Delete attachment
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

    if (fetchError) throw fetchError
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabaseStorage.storage
      .from('course-files')
      .remove([attachment.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete metadata even if file delete fails
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('course_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

