'use client'

import { Checkpoint, UserCheckpoint } from '@/lib/types/courses'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface CheckpointGateProps {
  checkpoint: Checkpoint
  userCheckpoint?: UserCheckpoint
  onSubmit: (text: string) => Promise<void>
}

export function CheckpointGate({
  checkpoint,
  userCheckpoint,
  onSubmit
}: CheckpointGateProps) {
  const [submissionText, setSubmissionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      setError('Please provide a submission')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(submissionText)
      setSubmissionText('')
    } catch (err: any) {
      setError(err.message || 'Failed to submit checkpoint')
    } finally {
      setSubmitting(false)
    }
  }

  const status = userCheckpoint?.status

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Checkpoint</h3>
        <div className="text-sm text-slate-300 leading-relaxed">
          {checkpoint.requirement_text}
        </div>
      </div>

      {status === 'approved' && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-sm font-semibold text-green-400">Approved</div>
            {userCheckpoint?.completed_at && (
              <div className="text-xs text-slate-400">
                Completed {new Date(userCheckpoint.completed_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-sm font-semibold text-yellow-400">Pending Review</div>
            <div className="text-xs text-slate-400">Your submission is under review</div>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-sm font-semibold text-red-400">Rejected</div>
            <div className="text-xs text-slate-400">Please review the requirements and resubmit</div>
          </div>
        </div>
      )}

      {(status === 'rejected' || !status) && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Submission
            </label>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              placeholder="Describe how you've completed the checkpoint requirements..."
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-y min-h-[120px]"
              rows={6}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !submissionText.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Checkpoint
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

