import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function reviewWorksheet(responses: Record<string, string>, moduleId: number) {
  const filledFields = Object.entries(responses).filter(([_, value]) => value && value.trim().length > 0)
  const lowEffortPatterns = [/^[a-z]{1,3}$/i, /^(asdf|qwer|test|xxx|aaa)/i, /^\.+$/, /^-+$/, /^n\/a$/i, /^(idk|dunno|whatever)/i]
  const hasLowEffortResponse = filledFields.some(([_, value]) => lowEffortPatterns.some(pattern => pattern.test(value.trim())))

  const requiredFieldIds = ['dislike-1', 'most-pressing', 'why-sucks', 'real-problem', 'game-plan']
  const missingRequired = requiredFieldIds.filter(id => !responses[id] || responses[id].trim().length < 5)

  if (missingRequired.length > 0) return { approved: false, feedback: `Please fill out all required fields with thoughtful responses. Missing: ${missingRequired.length} required fields.`, score: 3 }
  if (hasLowEffortResponse) return { approved: false, feedback: 'Some responses seem incomplete. Please provide more thoughtful answers.', score: 2 }

  const keyResponses = [responses['dislike-1'], responses['most-pressing'], responses['real-problem'], responses['game-plan']].filter(Boolean)
  const avgLength = keyResponses.reduce((sum, r) => sum + r.length, 0) / keyResponses.length
  if (avgLength < 20) return { approved: false, feedback: 'Your responses are a bit short. Try to expand on your thoughts.', score: 4 }

  return { approved: true, feedback: 'Great work! You\'ve completed this module. Keep this energy going!', score: 8 }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, moduleId, worksheetId, responses } = await request.json()
    if (!userId || !moduleId || !worksheetId || !responses) return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })

    const review = await reviewWorksheet(responses, moduleId)

    await (supabaseAdmin as any).from('worksheet_submissions').insert({
      user_id: userId, section: 'mindset', module_id: moduleId, worksheet_id: worksheetId,
      responses, ai_feedback: review.feedback, ai_score: review.score,
      status: review.approved ? 'approved' : 'needs_revision', reviewed_at: new Date().toISOString()
    })

    if (review.approved) {
      await (supabaseAdmin as any).from('user_module_progress').upsert({ user_id: userId, section: 'mindset', module_id: moduleId, completed_at: new Date().toISOString() }, { onConflict: 'user_id,section,module_id' })
      await (supabaseAdmin as any).from('user_module_progress').upsert({ user_id: userId, section: 'mindset', module_id: moduleId + 1, unlocked_at: new Date().toISOString() }, { onConflict: 'user_id,section,module_id' })
    }

    return NextResponse.json({ success: true, approved: review.approved, feedback: review.feedback, score: review.score })
  } catch (error) {
    console.error('Worksheet submission error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}



