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
    console.error('[API] ❌ Error fetching lesson attachments:')
    console.error('[API]   Error:', error)
    console.error('[API]   Error code:', error.code)
    console.error('[API]   Error message:', error.message)
    console.error('[API]   Error details:', error.details)
    return NextResponse.json({ 
      error: error.message || 'Server error',
      code: error.code,
      details: error.details
    }, { status: 500 })
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
    console.log('[API] Verifying lesson exists:', lessonId)
    const { data: lessonCheck, error: lessonError } = await supabaseAdmin
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lessonCheck) {
      console.error('[API] ❌ Lesson not found:', { 
        lessonId, 
        error: lessonError,
        lessonCheck 
      })
      try {
        await supabaseAdmin.storage.from('course-files').remove([filePath])
      } catch {}
      return NextResponse.json({ 
        error: 'Lesson not found',
        details: `Lesson with ID ${lessonId} does not exist`,
        lessonError: lessonError?.message
      }, { status: 404 })
    }
    
    console.log('[API] ✅ Lesson verified:', lessonCheck)

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

    // Try inserting - if table doesn't exist or has wrong schema, we'll get a clear error
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
      
      // Check if it's a table/column issue
      const isTableError = dbError.code === '42P01' || dbError.message?.includes('does not exist')
      const isForeignKeyError = dbError.code === '23503' || dbError.message?.includes('foreign key')
      
      // Try to clean up uploaded file
      try {
        await supabaseAdmin.storage.from('course-files').remove([filePath])
        console.log('[API] Cleaned up uploaded file')
      } catch (cleanupError) {
        console.error('[API] Failed to cleanup file:', cleanupError)
      }
      
      let errorMessage = 'Failed to save attachment record'
      if (isTableError) {
        errorMessage = 'course_attachments table does not exist. Please run the migration: fix-course-attachments-schema.sql'
      } else if (isForeignKeyError) {
        errorMessage = 'Foreign key constraint failed. The lesson_id may not exist or the table schema is incorrect.'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint || (isTableError ? 'Run fix-course-attachments-schema.sql migration' : undefined)
      }, { status: 500 })
    }

    console.log('[API] ✅ Attachment record saved:', attachment)

    return NextResponse.json({ attachment })
  } catch (error: any) {
    console.error('[API] ❌ Exception in POST attachment:')
    console.error('[API]   Error:', error)
    console.error('[API]   Error code:', error.code)
    console.error('[API]   Error message:', error.message)
    console.error('[API]   Error details:', error.details)
    console.error('[API]   Error stack:', error.stack)
    return NextResponse.json({ 
      error: error.message || 'Server error',
      code: error.code,
      details: error.details
    }, { status: 500 })
  }
}

// DELETE - Remove attachment
export async function DELETE(request: NextRequest) {
  console.log('🔴 DELETE ROUTE HIT:', request.url)
  
  try {
    const affiliate = await getCurrentAffiliate()
    console.log('🔴 Affiliate:', affiliate?.id, affiliate?.role)
    
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      console.log('🔴 UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    console.log('🔴 ID:', id)

    if (!id) {
      console.log('🔴 NO ID')
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }

    console.log('🔴 Calling supabase delete...')
    const { error } = await supabaseAdmin
      .from('course_attachments')
      .delete()
      .eq('id', id)

    console.log('🔴 Delete result - error:', error)

    if (error) {
      console.error('🔴 ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('🔴 SUCCESS')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('🔴 EXCEPTION:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

