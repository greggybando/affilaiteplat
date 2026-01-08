import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Get checkpoint for a specific section (public endpoint)
// Also accepts checkpoint ID directly
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params

    // First, check if this is a checkpoint ID (UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sectionId)
    
    if (isUUID) {
      // Try as checkpoint ID first
      const { data: checkpointById } = await supabaseAdmin
        .from('checkpoints')
        .select('*')
        .eq('id', sectionId)
        .single()
      
      if (checkpointById) {
        return NextResponse.json({ checkpoint: checkpointById })
      }
      
      // Try as section UUID
      const { data: section } = await supabaseAdmin
        .from('course_sections')
        .select('id')
        .eq('id', sectionId)
        .single()
      
      if (section) {
        const sectionTyped = section as any
        const { data: checkpoint } = await supabaseAdmin
          .from('checkpoints')
          .select('*')
          .eq('section_id', sectionTyped.id)
          .single()
        
        return NextResponse.json({ checkpoint: checkpoint || null })
      }
    } else {
      // Try as numeric section_id field (the numeric identifier, not the UUID primary key)
      const numericId = parseInt(sectionId, 10)
      if (!isNaN(numericId)) {
        const { data: section } = await supabaseAdmin
          .from('course_sections')
          .select('id')
          .eq('section_id', numericId)
          .single()
        
        if (section) {
          const sectionTyped = section as any
          const { data: checkpoint } = await supabaseAdmin
            .from('checkpoints')
            .select('*')
            .eq('section_id', sectionTyped.id)
            .single()
          
          return NextResponse.json({ checkpoint: checkpoint || null })
        }
      }
    }

    return NextResponse.json({ checkpoint: null })

  } catch (error: any) {
    console.error('Error fetching checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checkpoint', message: error.message },
      { status: 500 }
    )
  }
}

