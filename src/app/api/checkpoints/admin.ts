import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - List all checkpoints grouped by course → section
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    console.log('[Admin Checkpoints API] GET request, affiliate:', affiliate?.email, { role: affiliate?.role, is_admin: affiliate?.is_admin })
    
    if (!affiliate) {
      console.log('[Admin Checkpoints API] No affiliate found')
      return NextResponse.json({ error: 'Unauthorized - not logged in' }, { status: 401 })
    }
    
    // Check admin access
    const hasAccess = affiliate.role === 'admin' || affiliate.is_admin === true
    if (!hasAccess) {
      console.log('[Admin Checkpoints API] Access denied for:', affiliate.email)
      return NextResponse.json({ error: 'Unauthorized - not admin' }, { status: 401 })
    }
    
    console.log('[Admin Checkpoints API] Access granted for:', affiliate.email)

    // Get all courses
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('course_categories')
      .select('id, course_type, title')
      .order('course_type', { ascending: true })
      .order('display_order', { ascending: true })

    console.log('[Admin Checkpoints API] Categories query result:', { 
      count: categories?.length, 
      error: categoriesError?.message,
      categories: categories?.map((c: any) => ({ id: c.id, type: c.course_type, title: c.title }))
    })

    if (categoriesError) {
      console.error('[Admin Checkpoints API] Categories error:', categoriesError)
      return NextResponse.json({ courses: [], error: categoriesError.message })
    }

    if (!categories || categories.length === 0) {
      console.log('[Admin Checkpoints API] No categories found')
      return NextResponse.json({ courses: [], message: 'No course categories found in database' })
    }

    // Get all sections
    const categoryIds = (categories as any[]).map((c: any) => c.id)
    console.log('[Admin Checkpoints API] Looking for sections in categories:', categoryIds)
    
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from('course_sections')
      .select('id, category_id, title, display_order')
      .in('category_id', categoryIds)
      .order('display_order', { ascending: true })

    console.log('[Admin Checkpoints API] Sections query result:', { 
      count: sections?.length, 
      error: sectionsError?.message,
      sections: sections?.map((s: any) => ({ id: s.id, title: s.title }))
    })

    // Get all videos for these sections
    const sectionIds = (sections || []).map((s: any) => s.id)
    const { data: videos } = await supabaseAdmin
      .from('course_videos')
      .select('id, section_id, video_id, title, display_order')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    console.log('[Admin Checkpoints API] Videos query result:', { 
      count: videos?.length
    })

    // Get all checkpoints (including video-level ones)
    const { data: checkpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('*')
      .in('section_id', sectionIds)

    // Build nested structure
    const coursesMap = new Map()
    categories.forEach((category: any) => {
      coursesMap.set(category.id, {
        courseType: category.course_type,
        title: category.title,
        sections: []
      })
    })

    sections?.forEach((section: any) => {
      const category = coursesMap.get(section.category_id)
      if (category) {
        // Get section-level checkpoint (video_id is NULL)
        const sectionCheckpoint = checkpoints?.find((cp: any) => 
          cp.section_id === section.id && !cp.video_id
        )
        
        // Get videos for this section with their checkpoints
        const sectionVideos = (videos || [])
          .filter((v: any) => v.section_id === section.id)
          .map((video: any) => {
            const videoCheckpoint = checkpoints?.find((cp: any) => 
              cp.video_id === video.id
            )
            return {
              id: video.id,
              videoId: video.video_id,
              title: video.title,
              displayOrder: video.display_order,
              checkpoint: videoCheckpoint || null
            }
          })

        category.sections.push({
          id: section.id,
          title: section.title,
          displayOrder: section.display_order,
          checkpoint: sectionCheckpoint || null,
          videos: sectionVideos
        })
      }
    })

    return NextResponse.json({
      courses: Array.from(coursesMap.values())
    })

  } catch (error: any) {
    console.error('Error fetching checkpoints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checkpoints', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Create checkpoint (section-level or video-level)
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sectionId, videoId, title, description, requirements, aiReviewEnabled, aiReviewPrompt, requiresManualReview } = await request.json()

    if (!sectionId || !title || !requirements) {
      return NextResponse.json(
        { error: 'Missing required fields: sectionId, title, requirements' },
        { status: 400 }
      )
    }

    // Check if checkpoint already exists
    // For video-level: check if video already has a checkpoint
    // For section-level: check if section already has a section-level checkpoint
    console.log('[Create Checkpoint] Checking for existing checkpoint:', { sectionId, videoId: videoId || 'null (section-level)' })
    
    if (videoId) {
      const { data: existingVideo, error: existingVideoError } = await supabaseAdmin
        .from('checkpoints')
        .select('id')
        .eq('video_id', videoId)
        .maybeSingle()

      if (existingVideoError) {
        console.error('[Create Checkpoint] Error checking existing video checkpoint:', existingVideoError)
      }

      // maybeSingle returns null if no row found (no error)
      if (existingVideo) {
        console.log('[Create Checkpoint] Video checkpoint already exists:', (existingVideo as any).id)
        return NextResponse.json(
          { error: 'Checkpoint already exists for this video' },
          { status: 400 }
        )
      }
      console.log('[Create Checkpoint] No existing video checkpoint found, proceeding to create')
    } else {
      const { data: existingSection, error: existingSectionError } = await supabaseAdmin
        .from('checkpoints')
        .select('id')
        .eq('section_id', sectionId)
        .is('video_id', null)
        .maybeSingle()

      if (existingSectionError) {
        console.error('[Create Checkpoint] Error checking existing section checkpoint:', existingSectionError)
      }

      // maybeSingle returns null if no row found (no error)
      if (existingSection) {
        console.log('[Create Checkpoint] Section checkpoint already exists:', (existingSection as any).id)
        return NextResponse.json(
          { error: 'Section-level checkpoint already exists for this section' },
          { status: 400 }
        )
      }
      console.log('[Create Checkpoint] No existing section checkpoint found, proceeding to create')
    }

    // Create checkpoint
    console.log('[Create Checkpoint] Attempting to create:', {
      section_id: sectionId,
      video_id: videoId || null,
      title,
      requirements: requirements?.substring(0, 50)
    })

    const { data: checkpoint, error } = await supabaseAdmin
      .from('checkpoints')
      .insert({
        section_id: sectionId,
        video_id: videoId || null,
        title,
        description: description || null,
        requirements,
        ai_review_enabled: aiReviewEnabled !== false,
        ai_review_prompt: aiReviewPrompt || null,
        requires_manual_review: requiresManualReview === true
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[Create Checkpoint] Insert error:', error)
      return NextResponse.json(
        { error: `Failed to create checkpoint: ${error.message}`, details: error },
        { status: 500 }
      )
    }

    console.log('[Create Checkpoint] Success:', (checkpoint as any)?.id)
    return NextResponse.json({ checkpoint })

  } catch (error: any) {
    console.error('[Create Checkpoint] Catch error:', error)
    return NextResponse.json(
      { error: `Failed to create checkpoint: ${error.message}`, stack: error.stack },
      { status: 500 }
    )
  }
}

// PUT - Update checkpoint
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, videoId, title, description, requirements, aiReviewEnabled, aiReviewPrompt, requiresManualReview } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Missing checkpoint id' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (requirements !== undefined) updateData.requirements = requirements
    if (aiReviewEnabled !== undefined) updateData.ai_review_enabled = aiReviewEnabled
    if (aiReviewPrompt !== undefined) updateData.ai_review_prompt = aiReviewPrompt
    if (requiresManualReview !== undefined) updateData.requires_manual_review = requiresManualReview
    // Allow changing video_id (null = section-level, UUID = video-level)
    if (videoId !== undefined) updateData.video_id = videoId || null

    const { data: checkpoint, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ checkpoint })

  } catch (error: any) {
    console.error('Error updating checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update checkpoint', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete checkpoint
export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing checkpoint id' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('checkpoints')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error deleting checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to delete checkpoint', message: error.message },
      { status: 500 }
    )
  }
}

