'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Module, WorksheetField } from '../data/modules'

interface WorksheetFormProps {
  module: Module
  userId: string
  existingSubmission: any
}

export function WorksheetForm({ module, userId, existingSubmission }: WorksheetFormProps) {
  const router = useRouter()
  const worksheet = module.worksheet
  const [formData, setFormData] = useState<Record<string, string>>(() => existingSubmission?.responses || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; feedback?: string } | null>(null)

  const isCompleted = existingSubmission?.status === 'approved'
  const needsRevision = existingSubmission?.status === 'needs_revision'

  const handleChange = (fieldId: string, value: string) => setFormData(prev => ({ ...prev, [fieldId]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const response = await fetch('/api/mindset/submit-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, moduleId: module.id, worksheetId: worksheet.id, responses: formData })
      })
      const result = await response.json()

      if (result.success) {
        setSubmitResult({
          success: result.approved,
          message: result.approved ? 'Great work! Your worksheet has been approved. The next module is now unlocked!' : 'Your worksheet needs a bit more detail. Please review the feedback below.',
          feedback: result.feedback
        })
        if (result.approved) setTimeout(() => router.refresh(), 2000)
      } else {
        setSubmitResult({ success: false, message: result.error || 'Something went wrong. Please try again.' })
      }
    } catch (error) {
      setSubmitResult({ success: false, message: 'Failed to submit. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: WorksheetField) => {
    const value = formData[field.id] || ''
    switch (field.type) {
      case 'text':
        return <input type="text" value={value} onChange={(e) => handleChange(field.id, e.target.value)} placeholder={field.placeholder} disabled={isCompleted} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50" />
      case 'textarea':
        return <textarea value={value} onChange={(e) => handleChange(field.id, e.target.value)} placeholder={field.placeholder} rows={3} disabled={isCompleted} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none disabled:opacity-50" />
      case 'yesno':
        return (
          <div className="flex gap-3">
            <button type="button" onClick={() => handleChange(field.id, 'yes')} disabled={isCompleted} className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${value === 'yes' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'} disabled:opacity-50`}>YES</button>
            <button type="button" onClick={() => handleChange(field.id, 'no')} disabled={isCompleted} className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${value === 'no' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'} disabled:opacity-50`}>NO</button>
          </div>
        )
      default: return null
    }
  }

  if (worksheet.steps.length === 0) return <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-slate-700/30"><p className="text-slate-400">Worksheet coming soon.</p></div>

  return (
    <div>
      {worksheet.intro && <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 mb-8 border border-purple-500/20"><p className="text-slate-300 text-sm leading-relaxed italic">{worksheet.intro}</p></div>}
      {needsRevision && existingSubmission?.ai_feedback && <div className="bg-amber-500/10 rounded-xl p-6 mb-8 border border-amber-500/20"><h3 className="text-amber-400 font-semibold mb-2">Feedback on your submission:</h3><p className="text-slate-300 text-sm">{existingSubmission.ai_feedback}</p></div>}
      {isCompleted && <div className="bg-emerald-500/10 rounded-xl p-6 mb-8 border border-emerald-500/20"><h3 className="text-emerald-400 font-semibold mb-2">✓ Worksheet Completed!</h3><p className="text-slate-300 text-sm">You've completed this module. The next module is now unlocked.</p></div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {worksheet.steps.map((step, stepIndex) => (
          <div key={step.id} className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">{stepIndex + 1}</span>
                <h3 className="text-white font-semibold">{step.title}</h3>
              </div>
              {step.description && <p className="text-slate-400 text-sm ml-11">{step.description}</p>}
            </div>
            <div className="space-y-4 ml-11">
              {step.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-slate-300 text-sm font-medium mb-2">{field.label}{field.required && <span className="text-rose-400 ml-1">*</span>}</label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
        ))}

        {submitResult && <div className={`rounded-xl p-6 border ${submitResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><p className={`font-medium ${submitResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>{submitResult.message}</p>{submitResult.feedback && <p className="text-slate-300 text-sm mt-2">{submitResult.feedback}</p>}</div>}

        {!isCompleted && <div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none">{isSubmitting ? 'Submitting...' : needsRevision ? 'Resubmit Worksheet' : 'Submit Worksheet'}</button></div>}
      </form>
    </div>
  )
}



