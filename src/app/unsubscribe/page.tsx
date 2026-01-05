'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resubscribed'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid unsubscribe link')
      return
    }

    handleUnsubscribe()
  }, [token])

  const handleUnsubscribe = async () => {
    if (!token) return

    try {
      const res = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus(data.alreadyUnsubscribed ? 'success' : 'success')
        setMessage(data.message || 'You have been unsubscribed from email notifications.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to unsubscribe. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred. Please try again later.')
    }
  }

  const handleResubscribe = async () => {
    if (!token) return

    try {
      const res = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resubscribe: true })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('resubscribed')
        setMessage('You have been resubscribed to email notifications.')
      } else {
        setMessage(data.error || 'Failed to resubscribe. Please try again.')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again later.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <div className="text-slate-600">Processing...</div>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Unsubscribed</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={handleResubscribe}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Resubscribe
            </button>
          </>
        )}

        {status === 'resubscribed' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Resubscribed</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-slate-600">Loading...</div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
