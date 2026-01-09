'use client'

import { useState } from 'react'
import { Minimize2, Maximize2, X } from 'lucide-react'

interface VideoBannerProps {
  videoUrl?: string
  title?: string
}

export function VideoBanner({ videoUrl, title = 'How to Use the Affiliate Dashboard' }: VideoBannerProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  // Extract YouTube video ID if it's a YouTube URL
  const getYouTubeId = (url: string) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : null
  }

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null

  return (
    <div 
      className={`rounded-xl border overflow-hidden transition-all duration-300 relative ${isMinimized ? 'max-h-16' : ''}`}
      style={{
        background: 'rgba(26,26,46,0.6)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 0 20px rgba(6,182,212,0.15)'
      }}
    >
      <div 
        className="flex items-center justify-between p-4 border-b"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.1)'
        }}
      >
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-[rgba(255,255,255,0.6)] hover:text-cyan-400 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 text-[rgba(255,255,255,0.6)] hover:text-red-400 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-4">
          {!videoUrl ? (
            <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">
              <p className="text-sm">Tutorial video will appear here once configured.</p>
              <p className="text-xs mt-2 text-[rgba(255,255,255,0.4)]">
                Set NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO environment variable
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-xs text-[rgba(255,255,255,0.6)] uppercase tracking-wide">Tutorial Video</label>
                <div 
                  className="aspect-video rounded-lg overflow-hidden border max-h-[300px]"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  {youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

