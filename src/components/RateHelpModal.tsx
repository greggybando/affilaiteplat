'use client'

import { useState } from 'react'
import { X, ThumbsDown, ThumbsUp, Star } from 'lucide-react'

interface PendingSession {
  id: string
  mentor_id: string
  mentor_name: string
  mentor_avatar?: string
  dm_thread_id?: string
  first_response_at: string
}

interface RateHelpModalProps {
  session: PendingSession
  onClose: () => void
  onRated: () => void
}

export function RateHelpModal({ session, onClose, onRated }: RateHelpModalProps) {
  const [rating, setRating] = useState<'not_helpful' | 'helpful' | 'amazing' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!rating) {
      setError('Please select a rating')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/help-sessions/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          help_session_id: session.id,
          rating
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit rating')
      }

      onRated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Rate Your Help</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-slate-300 mb-2">
            How was your help from <span className="font-semibold text-white">{session.mentor_name}</span>?
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setRating('not_helpful')}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              rating === 'not_helpful'
                ? 'border-red-500 bg-red-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <ThumbsDown className={`w-6 h-6 ${rating === 'not_helpful' ? 'text-red-400' : 'text-slate-400'}`} />
            <span className="text-white font-medium">Not Helpful</span>
          </button>

          <button
            onClick={() => setRating('helpful')}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              rating === 'helpful'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <ThumbsUp className={`w-6 h-6 ${rating === 'helpful' ? 'text-yellow-400' : 'text-slate-400'}`} />
            <span className="text-white font-medium">Helpful</span>
          </button>

          <button
            onClick={() => setRating('amazing')}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              rating === 'amazing'
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <Star className={`w-6 h-6 ${rating === 'amazing' ? 'text-green-400' : 'text-slate-400'}`} />
            <span className="text-white font-medium">Amazing!</span>
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

