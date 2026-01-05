'use client'

import { useState } from 'react'
import { Module } from '../data/modules'
import { WorksheetForm } from './WorksheetForm'
import Link from 'next/link'

interface ModuleContentProps {
  module: Module
  userId: string
  existingSubmission: any
}

export function ModuleContent({ module, userId, existingSubmission }: ModuleContentProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'worksheet'>('videos')
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  const isCompleted = existingSubmission?.status === 'approved'
  const needsRevision = existingSubmission?.status === 'needs_revision'

  return (
    <div>
      <Link href="/mindset/content" className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 mb-6 transition-colors">← Back to Modules</Link>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm font-medium rounded-full border border-purple-500/20">Module {module.id}</span>
          {isCompleted && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/20">✓ Completed</span>}
          {needsRevision && <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm font-medium rounded-full border border-amber-500/20">Needs Revision</span>}
        </div>
        <h1 className="text-2xl font-bold text-white">{module.title}</h1>
        <p className="text-slate-400 mt-2">{module.description}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('videos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'videos' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'}`}>📹 Videos ({module.videos.length})</button>
        <button onClick={() => setActiveTab('worksheet')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'worksheet' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'}`}>📝 Worksheet {isCompleted ? '✓' : needsRevision ? '⚠️' : ''}</button>
      </div>

      {activeTab === 'videos' ? (
        <div className="space-y-4">
          {module.videos.length === 0 ? (
            <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-slate-700/30"><p className="text-slate-400">No videos in this module yet.</p></div>
          ) : (
            <>
              <div className="space-y-2">
                {module.videos.map((video, index) => (
                  <button key={video.id} onClick={() => setPlayingVideo(playingVideo === video.id ? null : video.id)} className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 text-left transition-all ${playingVideo === video.id ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white' : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-300 border border-slate-700/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${playingVideo === video.id ? 'bg-purple-500/20' : 'bg-slate-700/50'}`}>
                      {playingVideo === video.id ? <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg> : <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0"><span className="font-medium text-sm block truncate">{index + 1}. {video.title}</span></div>
                    <span className="text-xs text-slate-500">{video.duration}</span>
                  </button>
                ))}
              </div>
              {playingVideo && (
                <div className="mt-4 rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-700/50">
                  {module.videos.find(v => v.id === playingVideo)?.videoUrl ? (
                    <iframe src={module.videos.find(v => v.id === playingVideo)?.videoUrl} className="w-full h-full" allowFullScreen />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-3"><svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                      <p className="text-slate-400 text-sm">{module.videos.find(v => v.id === playingVideo)?.title}</p>
                      <p className="text-slate-600 text-xs mt-1">Video coming soon</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {!isCompleted && (
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
              <h3 className="text-white font-semibold mb-2">Ready to continue?</h3>
              <p className="text-slate-400 text-sm mb-4">Complete the worksheet to unlock the next module.</p>
              <button onClick={() => setActiveTab('worksheet')} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-medium rounded-lg text-sm transition-all">Go to Worksheet →</button>
            </div>
          )}
        </div>
      ) : (
        <WorksheetForm module={module} userId={userId} existingSubmission={existingSubmission} />
      )}
    </div>
  )
}



