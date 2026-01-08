'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Video {
  id: string
  title: string
  duration: string
  videoUrl: string
}

interface Asset {
  id: string
  title: string
  type: string
  url: string
}

interface Module {
  id: number
  number: number
  title: string
  description: string
  videos: Video[]
  assets: Asset[]
}

interface ModuleListProps {
  modules: Module[]
}

export function ModuleList({ modules }: ModuleListProps) {
  const [expandedModule, setExpandedModule] = useState<number | null>(1)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  const toggleModule = (moduleId: number) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  return (
    <div className="space-y-3">
      {modules.map((module) => {
        const isExpanded = expandedModule === module.id
        
        return (
          <div
            key={module.id}
            className={`
              backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300
              ${isExpanded 
                ? 'bg-slate-800/50 border border-cyan-500/30' 
                : 'bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50'
              }
            `}
          >
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full px-6 py-5 flex items-center gap-4 text-left"
            >
              {/* Module Number */}
              <div className={`
                w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all
                ${isExpanded 
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-700/50 text-slate-400'
                }
              `}>
                {String(module.number).padStart(2, '0')}
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${isExpanded ? 'text-white' : 'text-slate-200'}`}>
                  {module.title}
                </h3>
                <p className="text-slate-500 text-sm truncate">{module.description}</p>
              </div>

              {/* Video Count & Chevron */}
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-full">
                  {module.videos.length} videos
                </span>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-6 pb-6 border-t border-slate-700/50">
                {/* Videos Section */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Videos
                  </h4>
                  <div className="space-y-2">
                    {module.videos.map((video, index) => (
                      <button
                        key={video.id}
                        onClick={() => setPlayingVideo(playingVideo === video.id ? null : video.id)}
                        className={`
                          w-full px-4 py-3 rounded-lg flex items-center gap-3 text-left transition-all
                          ${playingVideo === video.id 
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-white' 
                            : 'bg-slate-700/30 hover:bg-slate-700/50 text-slate-300'
                          }
                        `}
                      >
                        {/* Play Icon */}
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center shrink-0
                          ${playingVideo === video.id ? 'bg-cyan-500/20' : 'bg-slate-600/50'}
                        `}>
                          {playingVideo === video.id ? (
                            <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block truncate">
                            {index + 1}. {video.title}
                          </span>
                        </div>

                        {/* Duration */}
                        <span className={`text-xs shrink-0 ${playingVideo === video.id ? 'text-slate-400' : 'text-slate-500'}`}>
                          {video.duration}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Video Player Placeholder */}
                  {playingVideo && module.videos.find(v => v.id === playingVideo) && (
                    <div className="mt-4 rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-700/50">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <p className="text-slate-400 text-sm">
                          {module.videos.find(v => v.id === playingVideo)?.title}
                        </p>
                        <p className="text-slate-600 text-xs mt-1">
                          {module.videos.find(v => v.id === playingVideo)?.duration}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assets Section */}
                {module.assets.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Resources
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {module.assets.map((asset) => (
                        <Link
                          key={asset.id}
                          href={asset.url || '#'}
                          className="px-4 py-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 flex items-center gap-3 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm text-slate-300 block truncate">{asset.title}</span>
                            <span className="text-xs text-slate-500">{asset.type}</span>
                          </div>
                          <svg 
                            className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}





