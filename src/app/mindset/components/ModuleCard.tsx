'use client'

import Link from 'next/link'
import { Module } from '../data/modules'

interface ModuleCardProps {
  module: Module
  isUnlocked: boolean
  isCompleted: boolean
  isNext: boolean
}

export function ModuleCard({ module, isUnlocked, isCompleted, isNext }: ModuleCardProps) {
  const content = (
    <div className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isUnlocked ? isCompleted ? 'bg-slate-800/50 border border-emerald-500/30 hover:border-emerald-500/50' : 'bg-slate-800/50 border border-purple-500/30 hover:border-purple-500/50 cursor-pointer' : 'bg-slate-800/20 border border-slate-700/30 opacity-60'}`}>
      <div className="px-6 py-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20' : isUnlocked ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-700/50 text-slate-500'}`}>
          {isCompleted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : isUnlocked ? String(module.id).padStart(2, '0') : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>{module.title}</h3>
            {isCompleted && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">Completed</span>}
            {isNext && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">Complete previous module to unlock</span>}
          </div>
          <p className="text-slate-500 text-sm mt-1 truncate">{module.description}</p>
        </div>
        <div className="shrink-0">
          {isUnlocked ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          ) : (
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          )}
        </div>
      </div>
      {isUnlocked && !isCompleted && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>In Progress</span>
            <span className="text-slate-600">•</span>
            <span>{module.videos.length} videos</span>
            <span className="text-slate-600">•</span>
            <span>1 worksheet</span>
          </div>
        </div>
      )}
    </div>
  )

  return isUnlocked ? <Link href={`/mindset/module/${module.id}`}>{content}</Link> : content
}



