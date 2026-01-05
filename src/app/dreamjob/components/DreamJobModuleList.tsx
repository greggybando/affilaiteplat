'use client'

import { useState } from 'react'
import { Paperclip, X } from 'lucide-react'

interface Video {
  id: string
  title: string
  youtubeId: string
}

interface Module {
  id: number
  number: number
  title: string
  description: string
  videos: Video[]
}

interface Attachment {
  id: string
  name: string
  file: File
}

interface DreamJobModuleListProps {
  modules: Module[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
  onVideoSelect?: (video: Video, module: Module) => void
}

export function DreamJobModuleList({ modules, affiliate, onVideoSelect }: DreamJobModuleListProps) {
  const isAdmin = affiliate?.role === 'admin' || affiliate?.role === 'moderator'
  const [expandedModule, setExpandedModule] = useState<number | null>(1)
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    modules[0]?.videos[0] ? { moduleId: modules[0].id, video: modules[0].videos[0] } : null
  )
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({})

  const toggleModule = (moduleId: number) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  const handleVideoSelect = (moduleId: number, video: Video) => {
    setSelectedVideo({ moduleId, video })
    const module = modules.find(m => m.id === moduleId)
    if (module && onVideoSelect) {
      onVideoSelect(video, module)
    }
  }

  const handleTitleChange = (videoId: string, newTitle: string) => {
    setVideoTitles(prev => ({ ...prev, [videoId]: newTitle }))
  }

  const handleNotesChange = (videoId: string, newNotes: string) => {
    setNotes(prev => ({ ...prev, [videoId]: newNotes }))
  }

  const handleAddAttachment = (videoId: string, files: FileList | null) => {
    if (!files) return
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      file
    }))
    setAttachments(prev => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), ...newAttachments]
    }))
  }

  const handleRemoveAttachment = (videoId: string, attachmentId: string) => {
    setAttachments(prev => ({
      ...prev,
      [videoId]: (prev[videoId] || []).filter(att => att.id !== attachmentId)
    }))
  }

  const getVideoTitle = (video: Video) => {
    return videoTitles[video.id] !== undefined ? videoTitles[video.id] : video.title
  }

  const getVideoNotes = (video: Video) => {
    return notes[video.id] || ''
  }

  const getVideoAttachments = (video: Video) => {
    return attachments[video.id] || []
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Course Navigation */}
      <div className="w-80 bg-slate-800/30 rounded-xl border-2 border-slate-700/50 overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4">
        <div className="p-4 border-b-2 border-slate-700/50 shrink-0 bg-slate-900/30">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Course Modules</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {modules.map((module) => {
            const isExpanded = expandedModule === module.id
            
            return (
              <div
                key={module.id}
                className="border-b-2 border-slate-700/50 last:border-b-0"
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/30 bg-slate-900/20"
                >
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{module.title}</div>
                    <div className="text-xs text-slate-400">{module.videos.length} lessons</div>
                  </div>
                </button>

                {/* Module Lessons */}
                {isExpanded && (
                  <div className="bg-slate-900/50 border-t border-slate-700/30">
                    {module.videos.map((video, index) => {
                      const isSelected = selectedVideo?.moduleId === module.id && selectedVideo?.video.id === video.id
                      const displayTitle = getVideoTitle(video)
                      const isLast = index === module.videos.length - 1
                      return (
                        <button
                          key={video.id}
                          onClick={() => handleVideoSelect(module.id, video)}
                          className={`w-full px-4 py-2.5 pl-11 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/20 ${
                            isLast ? 'border-b-0' : ''
                          } ${
                            isSelected ? 'bg-cyan-500/20 border-l-2 border-cyan-500' : ''
                          }`}
                        >
                          <div className="text-sm text-slate-200">{index + 1}. {displayTitle}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50">
        {selectedVideo ? (
          <div className="space-y-0">
            {/* Video Player */}
            <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
              {selectedVideo.video.youtubeId ? (
                <iframe
                  key={`${selectedVideo.video.id}-${selectedVideo.video.youtubeId}`}
                  src={`https://www.youtube.com/embed/${selectedVideo.video.youtubeId}?rel=0`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full absolute inset-0"
                  title={selectedVideo.video.title}
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-400">Video URL not available</p>
                </div>
              )}
            </div>

            {/* Video Info & Description */}
            <div className="p-6 space-y-6">
              {/* Editable Title */}
              <div>
                {isAdmin ? (
                  <input
                    type="text"
                    value={getVideoTitle(selectedVideo.video)}
                    onChange={(e) => handleTitleChange(selectedVideo.video.id, e.target.value)}
                    className="w-full text-2xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                    placeholder="Enter video title..."
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-white">{getVideoTitle(selectedVideo.video)}</h2>
                )}
              </div>

              {/* Notes/Attachments Section */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
                {(() => {
                  const videoNotes = getVideoNotes(selectedVideo.video)
                  const hasNotes = videoNotes && videoNotes.trim().length > 0
                  const isExpanded = notesExpanded[selectedVideo.video.id] || false
                  const shouldAutoExpand = hasNotes && videoNotes.length > 200
                  
                  return (
                    <>
                      <div className="flex items-center justify-between p-4">
                        <h3 className="text-sm font-semibold text-slate-300">Notes</h3>
                        {hasNotes && (
                          <button
                            onClick={() => setNotesExpanded(prev => ({ ...prev, [selectedVideo.video.id]: !isExpanded }))}
                            className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Collapse
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Expand
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Notes Content */}
                      {(shouldAutoExpand || isExpanded || !hasNotes) && (
                        <div className="px-4 pb-4">
                          {isAdmin ? (
                            <textarea
                              value={videoNotes}
                              onChange={(e) => handleNotesChange(selectedVideo.video.id, e.target.value)}
                              placeholder="Add your notes, thoughts, or questions about this lesson..."
                              className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50"
                              style={{ 
                                height: 'auto',
                                minHeight: hasNotes ? '120px' : '60px'
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = `${Math.max(hasNotes ? 120 : 60, target.scrollHeight)}px`
                              }}
                            />
                          ) : (
                            <div className="w-full bg-transparent text-slate-200 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50 whitespace-pre-wrap min-h-[60px]">
                              {videoNotes || <span className="text-slate-500 italic">No notes available</span>}
                            </div>
                          )}
                        </div>
                      )}
                      {hasNotes && !shouldAutoExpand && !isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="text-sm text-slate-400 line-clamp-2 p-3 border border-slate-700/50 rounded-lg bg-slate-800/30">
                            {videoNotes}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-300">Attachments</h4>
                    {isAdmin && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleAddAttachment(selectedVideo.video.id, e.target.files)}
                          className="hidden"
                        />
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors">
                          <Paperclip className="w-4 h-4" />
                          Attach File
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Attachments List */}
                  {getVideoAttachments(selectedVideo.video).length > 0 && (
                    <div className="space-y-2">
                      {getVideoAttachments(selectedVideo.video).map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                        >
                          <span className="text-sm text-slate-300 truncate flex-1">{attachment.name}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleRemoveAttachment(selectedVideo.video.id, attachment.id)}
                              className="ml-2 p-1 hover:bg-slate-700/50 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-slate-400">Select a video to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

