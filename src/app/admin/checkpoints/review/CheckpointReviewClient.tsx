'use client'

import { useState, useEffect } from 'react'
import { Check, X, Clock, Filter } from 'lucide-react'

interface Submission {
  id: string
  user_id: string
  checkpoint_id: string
  submission_text: string
  submission_url?: string
  screenshot_url?: string
  status: 'pending' | 'approved' | 'denied' | 'needs_review'
  ai_status?: 'approved' | 'denied' | 'needs_review'
  ai_reason?: string
  ai_confidence?: number
  admin_feedback?: string
  submitted_at: string
  reviewed_at?: string
  checkpoint?: {
    id: string
    title: string
    requirements: string
    section?: {
      id: string
      title: string
      category?: {
        course_type: string
        title: string
      }
    }
  }
  user?: {
    id: string
    name: string
    email: string
  }
}

interface Stats {
  total: number
  approved: number
  denied: number
  needsReview: number
  aiApproved: number
  aiDenied: number
  avgConfidence: number
}

interface CheckpointReviewClientProps {
  affiliate: {
    id: string
    role: string
  }
}

export function CheckpointReviewClient({ affiliate }: CheckpointReviewClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('needs_review')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [filter])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/checkpoints/review?filter=${filter}`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error loading submissions:', error)
      alert('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const reviewSubmission = async (submissionId: string, status: 'approved' | 'denied') => {
    setReviewing(true)
    try {
      const res = await fetch('/api/admin/checkpoints/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          status,
          feedback: reviewFeedback || undefined
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to review submission')
      }

      await loadSubmissions()
      setSelectedSubmission(null)
      setReviewFeedback('')
      alert(`Submission ${status}!`)
    } catch (error: any) {
      console.error('Error reviewing submission:', error)
      alert(error.message || 'Failed to review submission')
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Checkpoint Review Queue</h1>
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkpoint Review Queue</h1>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400">Total Submissions</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400">Approved</div>
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400">Needs Review</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.needsReview}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400">AI Confidence</div>
              <div className="text-2xl font-bold text-cyan-400">{Math.round(stats.avgConfidence)}%</div>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-2">
          {['needs_review', 'all', 'approved', 'denied'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === f
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-slate-400 text-center py-12">
              No submissions found.
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-lg font-semibold text-white mb-1">
                      {submission.checkpoint?.title || 'Unknown Checkpoint'}
                    </div>
                    <div className="text-sm text-slate-400">
                      User: {submission.user?.name || submission.user?.email || 'Unknown'} • 
                      Course: {submission.checkpoint?.section?.category?.title || 'Unknown'} • 
                      Section: {submission.checkpoint?.section?.title || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Submitted: {new Date(submission.submitted_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.status === 'approved' && (
                      <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-lg text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Approved
                      </span>
                    )}
                    {submission.status === 'denied' && (
                      <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-sm flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Denied
                      </span>
                    )}
                    {submission.status === 'needs_review' && (
                      <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Needs Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-slate-300 mb-2">Requirements:</div>
                  <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                    {submission.checkpoint?.requirements || 'N/A'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-slate-300 mb-2">Submission:</div>
                  <div className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg whitespace-pre-wrap">
                    {submission.submission_text}
                  </div>
                </div>

                {submission.screenshot_url && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-slate-300 mb-2">Screenshot:</div>
                    <img
                      src={submission.screenshot_url}
                      alt="Submission screenshot"
                      className="max-w-full h-auto rounded-lg border border-slate-700/50"
                    />
                  </div>
                )}

                {submission.ai_reason && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-slate-300 mb-2">
                      AI Review ({submission.ai_confidence}% confidence):
                    </div>
                    <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                      {submission.ai_reason}
                    </div>
                  </div>
                )}

                {submission.status === 'needs_review' && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Admin Feedback (Optional)
                      </label>
                      <textarea
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        rows={2}
                        placeholder="Add feedback for the user..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewSubmission(submission.id, 'approved')}
                        disabled={reviewing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => reviewSubmission(submission.id, 'denied')}
                        disabled={reviewing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  </div>
                )}

                {submission.admin_feedback && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-sm font-medium text-slate-300 mb-1">Admin Feedback:</div>
                    <div className="text-sm text-slate-400">{submission.admin_feedback}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

