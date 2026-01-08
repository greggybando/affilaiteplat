'use client'

import { Lock } from 'lucide-react'

interface LockedContentProps {
  message?: string
  unlockRequirement?: string
}

export function LockedContent({ message, unlockRequirement }: LockedContentProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30 opacity-60">
      <div className="flex items-center gap-3 mb-3">
        <Lock className="w-5 h-5 text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-500">🔒 Content Locked</h3>
      </div>
      {message && (
        <p className="text-slate-500 text-sm mb-2">{message}</p>
      )}
      {unlockRequirement && (
        <p className="text-slate-600 text-xs">{unlockRequirement}</p>
      )}
    </div>
  )
}




