'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Session, Chatbox } from '@talkjs/react'
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react'

type Props = {
  appId: string | null
}

export default function TalkJSTestClient({ appId }: Props) {
  const [asUser, setAsUser] = useState<'alice' | 'sebastian'>('alice')

  const userId =
    asUser === 'alice' ? 'sample_user_alice' : 'sample_user_sebastian'

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f0f1a' }}>
        <div className="max-w-lg w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-white">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h1 className="font-semibold text-lg mb-1">TalkJS App ID missing</h1>
              <p className="text-sm text-white/70 leading-relaxed">
                Set <code className="text-cyan-300">NEXT_PUBLIC_TALKJS_APP_ID</code> in{' '}
                <code className="text-cyan-300">.env.local</code> and restart the dev server.
              </p>
            </div>
          </div>
          <Link href="/" className="text-sm text-cyan-300 hover:underline">
            ← Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <div
        className="text-white flex flex-col shrink-0"
        style={{
          width: '250px',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
        }}
      >
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <div className="font-bold text-sm">LifeDesign</div>
              <div className="text-[10px] text-slate-400">TalkJS live chat</div>
            </div>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-4 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back home</span>
          </Link>

          <div className="text-[10px] text-[rgba(255,255,255,0.6)] mb-3 font-semibold uppercase tracking-wider px-2">
            Chat as
          </div>
          <button
            type="button"
            onClick={() => setAsUser('alice')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all ${
              asUser === 'alice'
                ? 'text-white bg-[rgba(34,211,238,0.15)] border border-[rgba(34,211,238,0.35)]'
                : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
            }`}
          >
            <span className="font-medium">Alice</span>
          </button>
          <button
            type="button"
            onClick={() => setAsUser('sebastian')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all ${
              asUser === 'sebastian'
                ? 'text-white bg-[rgba(34,211,238,0.15)] border border-[rgba(34,211,238,0.35)]'
                : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
            }`}
          >
            <span className="font-medium">Sebastian</span>
          </button>

          <div className="mt-6 mx-1 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/55 leading-relaxed">
            Classic <code className="text-cyan-300">Session</code> +{' '}
            <code className="text-cyan-300">Chatbox</code>. Open this page in two windows, pick Alice in one and Sebastian in the other, and message live.
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#0f0f1a' }}>
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">
              Live chat · {asUser === 'alice' ? 'Alice' : 'Sebastian'}
            </div>
            <div className="text-[11px] text-white/45">
              sample_conversation · app {appId}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Live test
          </span>
        </div>

        <div className="flex-1 min-h-0 p-3">
          <div className="h-full rounded-xl overflow-hidden border border-white/10 bg-white">
            <Session key={userId} appId={appId} userId={userId}>
              <Chatbox
                conversationId="sample_conversation"
                theme="default_dark"
                style={{ width: '100%', height: '100%' }}
                className="h-full"
              />
            </Session>
          </div>
        </div>
      </div>
    </div>
  )
}
