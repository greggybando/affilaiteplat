'use client'

import { useState } from 'react'
import { Minimize2, Maximize2, X } from 'lucide-react'

interface VideoBannerProps {
  videoUrl?: string
  imageUrl?: string
  title?: string
}

export function VideoBanner({ videoUrl, imageUrl, title = 'How to Use the Affiliate Dashboard' }: VideoBannerProps) {
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
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden transition-all duration-300 ${isMinimized ? 'max-h-16' : ''}`}>
      <div className="flex items-center justify-between p-4 bg-slate-900/50 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-6">
          {(!imageUrl && !videoUrl) ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">Video and image will appear here once configured.</p>
              <p className="text-xs mt-2 text-slate-500">
                Set NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO and NEXT_PUBLIC_AFFILIATE_PRODUCT_IMAGE environment variables
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${imageUrl && videoUrl ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-4xl mx-auto'}`}>
              {/* Image Section */}
              {imageUrl && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Product Image</label>
                  <div className="aspect-video bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
                    <img
                      src={imageUrl}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Video Section */}
              {videoUrl && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Tutorial Video</label>
                  <div className="aspect-video bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

