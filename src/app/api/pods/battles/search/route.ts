import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { calculatePodWeightClass } from '@/lib/pod-battles'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ pods: [] })
    }

    // Get current user's pod to exclude it
    const { data: currentPodMember } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    const currentPodId = currentPodMember ? (currentPodMember as any).pod_id : null

    // Search pods by name
    let podsQuery = supabaseAdmin
      .from('pods')
      .select('id, name, created_at, created_by')
      .ilike('name', `%${query}%`)
      .limit(20)

    if (currentPodId) {
      podsQuery = podsQuery.neq('id', currentPodId)
    }

    const { data: pods, error } = await podsQuery

    if (error) {
      console.error('Error searching pods:', error)
      return NextResponse.json({ error: 'Failed to search pods' }, { status: 500 })
    }

    // Calculate weight class for each pod
    const podsWithClass = await Promise.all(
      (pods || []).map(async (pod: any) => {
        const weightClass = await calculatePodWeightClass(pod.id, supabaseAdmin)
        return {
          id: pod.id,
          name: pod.name,
          createdAt: pod.created_at,
          weightClass,
        }
      })
    )

    return NextResponse.json({ pods: podsWithClass })
  } catch (error: any) {
    console.error('Search pods error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




