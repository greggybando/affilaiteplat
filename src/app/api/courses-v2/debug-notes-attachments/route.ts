import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to check notes and attachments for a lesson
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Check notes
    const { data: note, error: noteError } = await (supabaseAdmin as any)
      .from('lesson_notes')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    // Check attachments
    const { data: attachments, error: attachmentError } = await (supabaseAdmin as any)
      .from('course_attachments')
      .select('*')
      .eq('lesson_id', lessonId)

    // Verify lesson exists
    const { data: lesson, error: lessonError } = await (supabaseAdmin as any)
      .from('course_lessons')
      .select('id, title')
      .eq('id', lessonId)
      .single()

    return NextResponse.json({
      lessonId,
      affiliate: {
        id: affiliate.id,
        role: affiliate.role,
        name: affiliate.name
      },
      lesson: lesson || null,
      lessonError: lessonError ? {
        code: lessonError.code,
        message: lessonError.message
      } : null,
      notes: {
        exists: !!note,
        data: note || null,
        error: noteError ? {
          code: noteError.code,
          message: noteError.message
        } : null
      },
      attachments: {
        count: attachments?.length || 0,
        data: attachments || [],
        error: attachmentError ? {
          code: attachmentError.code,
          message: attachmentError.message
        } : null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Server error',
      stack: error.stack
    }, { status: 500 })
  }
}

