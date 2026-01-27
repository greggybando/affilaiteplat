import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - List available mentors
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active mentors with user info
    const { data: mentors, error: mentorsError } = await (supabaseAdmin as any)
      .from('mentors')
      .select(`
        id,
        user_id,
        is_active,
        availability,
        specialty_course_ids,
        lifetime_points,
        affiliates:user_id (
          id,
          name,
          avatar_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .order('availability', { ascending: false }) // online first, then away, then offline
      .order('lifetime_points', { ascending: false })

    if (mentorsError) {
      console.error('[Mentors List] Error fetching mentors:', mentorsError)
      return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 })
    }

    // Get course info for specialty courses
    const allCourseIds = new Set<string>()
    mentors?.forEach((m: any) => {
      if (m.specialty_course_ids && Array.isArray(m.specialty_course_ids)) {
        m.specialty_course_ids.forEach((cid: string) => allCourseIds.add(cid))
      }
    })

    const courseMap = new Map<string, any>()
    if (allCourseIds.size > 0) {
      const { data: courses } = await (supabaseAdmin as any)
        .from('courses')
        .select('id, title, slug')
        .in('id', Array.from(allCourseIds))

      courses?.forEach((c: any) => {
        courseMap.set(c.id, c)
      })
    }

    // Format response
    const formattedMentors = (mentors || []).map((mentor: any) => {
      const specialties = (mentor.specialty_course_ids || [])
        .map((cid: string) => courseMap.get(cid))
        .filter(Boolean)
        .map((c: any) => c.title)

      return {
        id: mentor.id,
        user_id: mentor.user_id,
        name: mentor.affiliates?.name || 'Unknown',
        avatar_name: mentor.affiliates?.avatar_name,
        avatar_url: mentor.affiliates?.avatar_url,
        availability: mentor.availability,
        specialty_courses: specialties,
        lifetime_points: mentor.lifetime_points || 0
      }
    })

    // Sort: online first, then away, then by lifetime points
    const availabilityOrder = { online: 0, away: 1, offline: 2 }
    formattedMentors.sort((a: any, b: any) => {
      const aOrder = availabilityOrder[a.availability as keyof typeof availabilityOrder] ?? 3
      const bOrder = availabilityOrder[b.availability as keyof typeof availabilityOrder] ?? 3
      if (aOrder !== bOrder) return aOrder - bOrder
      return b.lifetime_points - a.lifetime_points
    })

    return NextResponse.json({
      mentors: formattedMentors,
      count: formattedMentors.length
    })
  } catch (error: any) {
    console.error('[Mentors List] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

