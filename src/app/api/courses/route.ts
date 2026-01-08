import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const showAll = req.nextUrl.searchParams.get('all') === 'true'

    let query = supabase
      .from('courses')
      .select(`*, course_modules (*, course_lessons (*, course_attachments_new (*)))`)
      .order('sort_order')

    if (!showAll) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort modules and lessons
    data?.forEach((course: any) => {
      course.course_modules?.sort((a: any, b: any) => a.sort_order - b.sort_order)
      course.course_modules?.forEach((m: any) => {
        m.course_lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order)
      })
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in courses API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


