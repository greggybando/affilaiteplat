'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DiagnosisWorksheet({ userId }: { userId: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    'dislike-1': '', 'dislike-2': '', 'dislike-3': '', 'dislike-4': '', 'dislike-5': '',
    'most-pressing': '',
    'why-sucks': '', 'if-fixed-1': '', 'what-else-1': '', 'if-fixed-2': '', 'what-else-2': '', 'real-problem': '',
    'someone-stuck': '', 'who-stuck': '', 'what-to-say': '',
    'game-plan': ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/worksheet/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, worksheetId: 'diagnosis-worksheet', responses: form })
    })
    const data = await res.json()
    setResult({ ok: data.approved, msg: data.feedback })
    if (data.approved) setTimeout(() => router.refresh(), 1500)
    setSubmitting(false)
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h2 className="text-xl font-bold text-white mb-2">📝 Diagnosis Worksheet</h2>
      <p className="text-slate-400 text-sm mb-6 italic">Be honest — nobody sees this but you.</p>
      
      <form onSubmit={submit} className="space-y-6">
        {/* Step 1 */}
        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-3">Step 1: What do you NOT like about your life right now?</h3>
          <p className="text-slate-400 text-sm mb-3">Write down things you don't like — focus on the big, annoying, and obvious ones first.</p>
          {['dislike-1','dislike-2','dislike-3','dislike-4','dislike-5'].map((id, i) => (
            <textarea 
              key={id} 
              value={form[id as keyof typeof form]} 
              onChange={e => setForm({...form, [id]: e.target.value})} 
              placeholder={i === 0 ? 'e.g., "I don\'t like my job"' : i === 1 ? 'e.g., "I\'m broke at the end of every month"' : i === 2 ? 'e.g., "I have no free time"' : i === 3 ? 'e.g., "My boss treats me like garbage"' : 'Add more if needed'} 
              rows={2} 
              className="w-full mb-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
            />
          ))}
        </div>
        
        {/* Step 2 */}
        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-3">Step 2: Pick the MOST pressing one weighing heaviest on your soul</h3>
          <p className="text-slate-400 text-sm mb-3">Which one, if removed or changed, would give you the most breathing room / fresh air?</p>
          <textarea 
            value={form['most-pressing']} 
            onChange={e => setForm({...form, 'most-pressing': e.target.value})} 
            placeholder="Write the one thing that weighs heaviest..." 
            rows={3} 
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
          />
        </div>
        
        {/* Step 3 */}
        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-3">Step 3: Figure out the REAL problem</h3>
          <p className="text-slate-400 text-sm mb-3">Keep asking "If that was fixed, would I be happy?" until you hit YES.</p>
          <textarea 
            value={form['why-sucks']} 
            onChange={e => setForm({...form, 'why-sucks': e.target.value})} 
            placeholder="e.g., 'I don\'t make enough money'" 
            rows={2} 
            className="w-full mb-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
          />
          <div className="mb-3">
            <label className="block text-slate-300 text-sm font-medium mb-2">If that was fixed, would you be happy?</label>
            <div className="flex gap-2">
              {['yes','no'].map(v => (
                <button 
                  key={v} 
                  type="button" 
                  onClick={() => setForm({...form, 'if-fixed-1': v})} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form['if-fixed-1'] === v ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-slate-300'}`}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {form['if-fixed-1'] === 'no' && (
            <>
              <textarea 
                value={form['what-else-1']} 
                onChange={e => setForm({...form, 'what-else-1': e.target.value})} 
                placeholder="e.g., 'I also don\'t like waking up at 6am'" 
                rows={2} 
                className="w-full mb-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
              />
              <div className="mb-3">
                <label className="block text-slate-300 text-sm font-medium mb-2">If THAT was also fixed, would you be happy?</label>
                <div className="flex gap-2">
                  {['yes','no'].map(v => (
                    <button 
                      key={v} 
                      type="button" 
                      onClick={() => setForm({...form, 'if-fixed-2': v})} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form['if-fixed-2'] === v ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-slate-300'}`}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {form['if-fixed-2'] === 'no' && (
                <textarea 
                  value={form['what-else-2']} 
                  onChange={e => setForm({...form, 'what-else-2': e.target.value})} 
                  placeholder="Keep going until you hit the real problem..." 
                  rows={2} 
                  className="w-full mb-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
                />
              )}
            </>
          )}
          <label className="block text-slate-300 text-sm font-medium mb-2 mt-3">THE REAL PROBLEM IS:</label>
          <textarea 
            value={form['real-problem']} 
            onChange={e => setForm({...form, 'real-problem': e.target.value})} 
            placeholder="Write the thing you landed on after all your YES/NO questions" 
            rows={3} 
            className="w-full px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-slate-200 placeholder-slate-400 resize-none focus:ring-2 focus:ring-purple-500/50" 
          />
        </div>
        
        {/* Step 4 */}
        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-3">Step 4: Is there someone making you feel "stuck"?</h3>
          <p className="text-slate-400 text-sm mb-3">We often only allow shitty situations to continue because we're afraid to tell a specific person.</p>
          <div className="mb-3">
            <label className="block text-slate-300 text-sm font-medium mb-2">Is there someone like this in your life?</label>
            <div className="flex gap-2">
              {['yes','no'].map(v => (
                <button 
                  key={v} 
                  type="button" 
                  onClick={() => setForm({...form, 'someone-stuck': v})} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form['someone-stuck'] === v ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-slate-300'}`}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {form['someone-stuck'] === 'yes' && (
            <div className="space-y-3">
              <input 
                value={form['who-stuck']} 
                onChange={e => setForm({...form, 'who-stuck': e.target.value})} 
                placeholder="Name or relationship" 
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50" 
              />
              <textarea 
                value={form['what-to-say']} 
                onChange={e => setForm({...form, 'what-to-say': e.target.value})} 
                placeholder="Dump fully. Get it all out on paper." 
                rows={3} 
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500/50" 
              />
            </div>
          )}
        </div>
        
        {/* Step 5 */}
        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-white font-semibold mb-3">Step 5: What is your EXACT next step?</h3>
          <p className="text-slate-400 text-sm mb-3">The ONE very simple big scary step that would basically solve everything in one swoop.</p>
          <label className="block text-slate-300 text-sm font-medium mb-2">Write your gameplan — the big scary step:</label>
          <textarea 
            value={form['game-plan']} 
            onChange={e => setForm({...form, 'game-plan': e.target.value})} 
            placeholder="e.g., '1) Make $1 online to prove I can do it...'" 
            rows={4} 
            className="w-full px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-slate-200 placeholder-slate-400 resize-none focus:ring-2 focus:ring-purple-500/50" 
          />
        </div>
        
        {result && <div className={`p-3 rounded-lg ${result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{result.msg}</div>}
        
        <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 text-white font-semibold rounded-xl">
          {submitting ? 'Submitting...' : 'Submit & Unlock Full LD World'}
        </button>
      </form>
    </div>
  )
}

