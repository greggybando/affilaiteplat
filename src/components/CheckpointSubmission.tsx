'use client'

'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Check, Clock, AlertCircle, Loader2, RotateCcw } from 'lucide-react'

interface CheckpointSubmissionProps {
  checkpointId: string
  checkpointTitle: string
  requirements: string
  sectionId?: string
  onSuccess?: (status: 'approved' | 'denied' | 'needs_review') => void
}

export function CheckpointSubmission({
  checkpointId,
  checkpointTitle,
  requirements,
  sectionId,
  onSuccess
}: CheckpointSubmissionProps) {
  const [submissionText, setSubmissionText] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<'not_started' | 'approved' | 'denied' | 'needs_review' | null>(null)
  const [submissionData, setSubmissionData] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Load existing submission status from user_checkpoints
  useEffect(() => {
    const loadStatus = async () => {
      try {
        // Fetch user's checkpoint submission status directly
        const res = await fetch(`/api/checkpoints/user-submission?checkpointId=${checkpointId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.submission) {
            setSubmissionStatus(data.submission.status || 'not_started')
            setSubmissionData({
              reason: data.submission.ai_review_notes || data.submission.admin_feedback,
              missing: [],
              confidence: data.submission.ai_confidence
            })
          }
        }
      } catch (error) {
        console.error('Error loading submission status:', error)
      } finally {
        setLoadingStatus(false)
      }
    }
    loadStatus()
  }, [checkpointId])

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be less than 5MB')
        return
      }
      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
  }

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot) return null

    try {
      console.log('[Screenshot Upload] Starting upload...')
      console.log('[Screenshot Upload] File size:', screenshot.size, 'bytes')
      console.log('[Screenshot Upload] File type:', screenshot.type)
      console.log('[Screenshot Upload] Checkpoint ID:', checkpointId)

      // Use server-side upload endpoint instead of direct client upload
      const formData = new FormData()
      formData.append('file', screenshot)
      formData.append('checkpointId', checkpointId)

      const res = await fetch('/api/checkpoints/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('[Screenshot Upload] Upload error:', data)
        throw new Error(data.error || data.message || 'Failed to upload screenshot')
      }

      console.log('[Screenshot Upload] Upload successful, URL:', data.url)

      return data.url
    } catch (error: any) {
      console.error('[Screenshot Upload] Error uploading screenshot:', error)
      throw new Error(error.message || 'Failed to upload screenshot. Please check your connection and try again.')
    }
  }

  const handleSubmit = async (e?: React.MouseEvent) => {
    // Prevent any form submission or navigation
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (submissionText.trim().length < 50) {
      setError('Submission text must be at least 50 characters')
      return
    }

    setError(null)
    setUploading(true)
    setSubmitting(true)

    try {
      // Upload screenshot (optional)
      let screenshotUrl: string | null = null
      if (screenshot) {
        try {
          screenshotUrl = await uploadScreenshot()
          if (!screenshotUrl) {
            console.warn('Screenshot upload returned no URL, continuing without screenshot')
          }
        } catch (uploadError: any) {
          console.error('Screenshot upload error:', uploadError)
          // Don't block submission if screenshot upload fails - just continue without it
          console.warn('Continuing submission without screenshot due to upload error')
        }
      }

      // Submit checkpoint using unified API
      console.log('[Checkpoint Submit] Submitting checkpoint:', {
        checkpointId,
        hasScreenshot: !!screenshotUrl,
        textLength: submissionText.trim().length
      })

      const res = await fetch(`/api/checkpoints/${checkpointId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_text: submissionText.trim(),
          screenshot_url: screenshotUrl || null
        })
      })

      const data = await res.json()

      console.log('[Checkpoint Submit] Response:', { status: res.status, ok: res.ok, data })

      if (!res.ok) {
        let errorMsg = data.error || data.message || 'Failed to submit checkpoint'
        if (data.details) {
          errorMsg += `: ${data.details}`
        }
        if (data.hint) {
          errorMsg += ` (${data.hint})`
        }
        console.error('[Checkpoint Submit] Error:', errorMsg, data)
        throw new Error(errorMsg)
      }

      // Update status IMMEDIATELY
      setSubmissionStatus(data.status)
      setSubmissionData({
        reason: data.reason,
        missing: data.missing || [],
        confidence: data.confidence
      })

      // Reset form only if approved or needs_review (keep form if denied for resubmission)
      if (data.status === 'approved' || data.status === 'needs_review') {
        setSubmissionText('')
        setScreenshot(null)
        setScreenshotPreview(null)
      }
      
      // Call onSuccess callback IMMEDIATELY with status to refresh unlock status
      // Pass the status so parent can handle approval instantly
      if (onSuccess) {
        // Call immediately for instant UI update
        onSuccess(data.status)
      }

    } catch (error: any) {
      console.error('Error submitting checkpoint:', error)
      setError(error.message || 'Failed to submit checkpoint')
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  const handleResubmit = () => {
    setSubmissionStatus(null)
    setSubmissionData(null)
    setError(null)
  }

  if (loadingStatus) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
        <div className="text-slate-400">Loading checkpoint status...</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{checkpointTitle}</h3>
      <div className="text-sm text-slate-400 mb-4">
        <div className="font-medium text-slate-300 mb-2">Requirements:</div>
        <div className="whitespace-pre-wrap">{requirements}</div>
      </div>

      {/* Status Display */}
      {submissionStatus && submissionStatus !== 'not_started' && (
        <div className={`mb-4 p-4 rounded-lg border ${
          submissionStatus === 'approved' 
            ? 'bg-green-600/20 border-green-600/50' 
            : submissionStatus === 'denied'
            ? 'bg-red-600/20 border-red-600/50'
            : 'bg-yellow-600/20 border-yellow-600/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {submissionStatus === 'approved' && <Check className="w-5 h-5 text-green-400" />}
            {submissionStatus === 'denied' && <X className="w-5 h-5 text-red-400" />}
            {submissionStatus === 'needs_review' && <Clock className="w-5 h-5 text-yellow-400" />}
            <span className={`font-semibold ${
              submissionStatus === 'approved' 
                ? 'text-green-400' 
                : submissionStatus === 'denied'
                ? 'text-red-400'
                : 'text-yellow-400'
            }`}>
              {submissionStatus === 'approved' && 'Approved'}
              {submissionStatus === 'denied' && 'Denied'}
              {submissionStatus === 'needs_review' && 'Under Review'}
            </span>
          </div>
          {submissionStatus === 'approved' && (
            <div className="text-sm text-green-300">
              <p className="font-semibold mb-1">✅ Checkpoint complete! Next section unlocked.</p>
              <p className="text-green-400/80">You can now proceed to the next section.</p>
            </div>
          )}
          {submissionStatus === 'denied' && submissionData && (
            <div className="text-sm text-red-300">
              <p className="mb-2">Reason: {submissionData.reason || 'Requirements not met'}</p>
              {submissionData.missing && submissionData.missing.length > 0 && (
                <div className="mb-2">
                  <p className="font-medium mb-1">Missing:</p>
                  <ul className="list-disc list-inside">
                    {submissionData.missing.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={handleResubmit}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 text-white text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Resubmit
              </button>
            </div>
          )}
          {submissionStatus === 'needs_review' && (
            <p className="text-sm text-yellow-300">⏳ Submitted! Under review, you'll be notified within 24 hours.</p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Submission Form - Only show if not approved or if denied (for resubmission) */}
      {(submissionStatus === null || submissionStatus === 'not_started' || submissionStatus === 'denied') && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Submission Text * (min 50 characters)
            </label>
          <textarea
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            rows={6}
            placeholder="Describe what you completed, share your work, or explain how you met the requirements..."
            disabled={submitting}
          />
          <div className={`text-xs mt-1 ${submissionText.length >= 50 ? 'text-green-400' : 'text-slate-500'}`}>
            {submissionText.length}/50 characters minimum
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Screenshot (Optional)
          </label>
          {!screenshotPreview ? (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
              <div className="text-center">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <div className="text-sm text-slate-400">Click to upload screenshot</div>
                <div className="text-xs text-slate-500 mt-1">Max 5MB</div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
                disabled={submitting}
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="w-full h-auto rounded-lg border border-slate-700"
              />
              <button
                onClick={removeScreenshot}
                className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full"
                disabled={submitting}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleSubmit(e)
          }}
          disabled={submitting || submissionText.trim().length < 50}
          className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Submit Checkpoint
            </>
          )}
        </button>
        </div>
      )}
    </div>
  )
}

