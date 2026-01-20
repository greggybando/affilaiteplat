import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get lessonId from query
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    
    // 1. Check if course_attachments table exists
    const { data: tables, error: tablesError } = await (supabaseAdmin as any)
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%attachment%')
    
    // 2. Get all attachments
    const { data: allAttachments, error: allError } = await (supabaseAdmin as any)
      .from('course_attachments')
      .select('*')
    
    // 3. Get attachments for specific lesson if provided
    let lessonAttachments = null
    let lessonError = null
    if (lessonId) {
      const result = await (supabaseAdmin as any)
        .from('course_attachments')
        .select('*')
        .eq('lesson_id', lessonId)
      lessonAttachments = result.data
      lessonError = result.error
    }
    
    // 4. Try to get table structure
    const { data: columns, error: columnsError } = await (supabaseAdmin as any)
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'course_attachments')
    
    return NextResponse.json({
      tables: tables || [],
      tablesError: tablesError?.message,
      allAttachments: allAttachments || [],
      allError: allError?.message,
      lessonAttachments,
      lessonError: lessonError?.message,
      columns: columns || [],
      columnsError: columnsError?.message,
      lessonIdProvided: lessonId
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

