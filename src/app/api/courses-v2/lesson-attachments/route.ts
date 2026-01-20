import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch attachments for a lesson
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Fetch attachments from course_attachments table (new system)
    const { data: attachments, error } = await (supabaseAdmin as any)
      .from('course_attachments')
      .select('id, title, file_url, file_type, file_size, sort_order, created_at')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ attachments: attachments || [] })
  } catch (error: any) {
    console.error('Error fetching lesson attachments:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST - Upload attachment for a lesson
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const lessonId = formData.get('lessonId') as string

    if (!file || !lessonId) {
      return NextResponse.json({ error: 'Missing file or lessonId' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit` 
      }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${lessonId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `course-attachments/${fileName}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('course-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('course-files')
      .getPublicUrl(filePath)

    // Determine file type
    const fileType = file.type || (fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream')

    // Verify lesson exists first
    const { data: lessonCheck, error: lessonError } = await supabaseAdmin
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lessonCheck) {
      console.error('[API] ❌ Lesson not found:', { lessonId, error: lessonError })
      await supabaseAdmin.storage.from('course-files').remove([filePath])
      return NextResponse.json({ 
        error: 'Lesson not found',
        details: `Lesson with ID ${lessonId} does not exist`
      }, { status: 404 })
    }

    // Save attachment record
    const insertData = {
      lesson_id: lessonId,
      title: file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: file.size,
      sort_order: 0
    }

    console.log('[API] Inserting attachment record:', insertData)

    const { data: attachment, error: dbError } = await (supabaseAdmin as any)
      .from('course_attachments')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('[API] ❌ Database error details:')
      console.error('[API]   Error code:', dbError.code)
      console.error('[API]   Error message:', dbError.message)
      console.error('[API]   Error details:', dbError.details)
      console.error('[API]   Error hint:', dbError.hint)
      console.error('[API]   Full error:', JSON.stringify(dbError, null, 2))
      
      // Try to clean up uploaded file
      try {
        await supabaseAdmin.storage.from('course-files').remove([filePath])
        console.log('[API] Cleaned up uploaded file')
      } catch (cleanupError) {
        console.error('[API] Failed to cleanup file:', cleanupError)
      }
      
      return NextResponse.json({ 
        error: 'Failed to save attachment record',
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint
      }, { status: 500 })
    }

    console.log('[API] ✅ Attachment record saved:', attachment)

    return NextResponse.json({ attachment })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove attachment
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
    const { data: attachment, error: fetchError } = await (supabaseAdmin as any)
      .from('course_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Extract file path from URL
    const url = new URL(attachment.file_url)
    const filePath = url.pathname.split('/').slice(-2).join('/') // Get last 2 segments

    // Delete from storage
    await supabaseAdmin.storage.from('course-files').remove([filePath])

    // Delete from database
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('course_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

