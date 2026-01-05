'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function FirstWorksheet({ userId }: { userId: string }) {
  const router = useRouter()
  const [form, setForm] = useState({ 'why-here': '', 'current-situation': '', 'ideal-life': '', 'biggest-obstacle': '', 'commitment': '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/worksheet/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, worksheetId: 'first-worksheet', responses: form })
    })
    const data = await res.json()
    setResult({ ok: data.approved, msg: data.feedback })
    if (data.approved) setTimeout(() => router.refresh(), 1500)
    setSubmitting(false)
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h2 className="text-xl font-bold text-white mb-2">🚀 Welcome Worksheet</h2>
      <p className="text-slate-400 text-sm mb-6">Complete this to unlock the Life Design System.</p>
      
      <form onSubmit={submit} className="space-y-4">
        {[
          { id: 'why-here', label: 'Why are you here? What made you join?', ph: 'What made you join...' },
          { id: 'current-situation', label: 'Describe your current life situation', ph: 'Where are you at right now...' },
          { id: 'ideal-life', label: 'What does your ideal life look like 1 year from now?', ph: 'Dream big...' },
          { id: 'biggest-obstacle', label: 'What\'s the biggest obstacle standing in your way?', ph: 'What\'s really holding you back...' },
          { id: 'commitment', label: 'What are you committing to by going through this program?', ph: 'What are you committing to...' }
        ].map(f => (
          <div key={f.id}>
            <label className="block text-white text-sm font-medium mb-1">{f.label}</label>
            <textarea value={form[f.id as keyof typeof form]} onChange={e => setForm({...form, [f.id]: e.target.value})} placeholder={f.ph} rows={2} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
        ))}
        
        {result && <div className={`p-3 rounded-lg ${result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{result.msg}</div>}
        
        <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 text-white font-semibold rounded-xl">
          {submitting ? 'Submitting...' : 'Submit & Unlock'}
        </button>
      </form>
    </div>
  )
}

