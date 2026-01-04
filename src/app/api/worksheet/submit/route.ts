import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UNLOCK_MAP: Record<string, string[]> = {
  'first-worksheet': ['core-reframes', 'diagnosis-process'],
  'diagnosis-worksheet': ['ld-world-full']
}

async function reviewWorksheet(responses: Record<string, string>, worksheetId: string) {
  const filled = Object.entries(responses).filter(([_, v]) => v?.trim().length > 0)
  const lowEffort = [/^[a-z]{1,3}$/i, /^(asdf|qwer|test)/i, /^n\/a$/i, /^(idk|dunno)/i]
  const hasLowEffort = filled.some(([_, v]) => lowEffort.some(p => p.test(v.trim())))
  const minFields = worksheetId === 'first-worksheet' ? 2 : 4

  if (filled.length < minFields) return { approved: false, feedback: `Please fill out at least ${minFields} fields thoughtfully.`, score: 2 }
  if (hasLowEffort) return { approved: false, feedback: 'Some responses seem incomplete. Dig deeper.', score: 3 }
  
  const avgLen = filled.reduce((s, [_, v]) => s + v.length, 0) / filled.length
  if (avgLen < 15) return { approved: false, feedback: 'Your responses are too short. This is for YOUR transformation.', score: 4 }

  return { approved: true, feedback: 'Great work! You\'ve unlocked the next section.', score: 8 }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, worksheetId, responses } = await request.json()
    if (!userId || !worksheetId || !responses) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })

    const review = await reviewWorksheet(responses, worksheetId)

    await (supabaseAdmin as any).from('worksheet_submissions').insert({
      user_id: userId, worksheet_id: worksheetId, responses,
      ai_feedback: review.feedback, ai_score: review.score,
      status: review.approved ? 'approved' : 'needs_revision',
      reviewed_at: new Date().toISOString()
    })

    if (review.approved) {
      const unlocks = UNLOCK_MAP[worksheetId] || []
      for (const key of unlocks) {
        await (supabaseAdmin as any).from('user_unlocks').upsert(
          { user_id: userId, unlock_key: key, unlocked_by: worksheetId },
          { onConflict: 'user_id,unlock_key' }
        )
      }
    }

    return NextResponse.json({ success: true, approved: review.approved, feedback: review.feedback, unlocked: review.approved ? UNLOCK_MAP[worksheetId] : [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

