'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, Save, X } from 'lucide-react'

interface Video {
  id: string
  title: string
  loomId?: string
  youtubeId?: string
}

interface Module {
  id: number
  number: number
  title: string
  description: string
  videos: Video[]
  categoryId?: string
  categoryTitle?: string
}

interface Category {
  id: string
  title: string
  sections: Module[]
  isStartHere?: boolean
}

interface Attachment {
  id: string
  name: string
  file: File
}

interface MindsetModuleListProps {
  modules: Module[]
  categories?: Category[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
}

export function MindsetModuleList({ modules, categories, affiliate }: MindsetModuleListProps) {
  const isAdmin = affiliate?.role === 'admin' || affiliate?.role === 'moderator'
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['starthere', 'mindset', 'lifedesign', 'thinkingtools']))
  const getInitialExpandedSections = () => {
    if (categories && categories.length > 0) {
      return new Set(categories.map(cat => cat.sections[0]?.id).filter(Boolean) as number[])
    }
    return new Set(modules.map(m => m.id).slice(0, 3))
  }
  const [expandedSections, setExpandedSections] = useState<Set<number>>(getInitialExpandedSections())
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    categories?.[0]?.sections[0]?.videos[0] ? { moduleId: categories[0].sections[0].id, video: categories[0].sections[0].videos[0] } :
    modules[0]?.videos[0] ? { moduleId: modules[0].id, video: modules[0].videos[0] } : null
  )
  
  // Ensure start here section is always expanded and video is selected
  useEffect(() => {
    if (categories) {
      const startHereCategory = categories.find(cat => cat.isStartHere)
      if (startHereCategory && startHereCategory.sections[0]) {
        setExpandedSections(prev => {
          const newSet = new Set(prev)
          newSet.add(startHereCategory.sections[0].id)
          return newSet
        })
        if (!selectedVideo && startHereCategory.sections[0].videos[0]) {
          setSelectedVideo({ 
            moduleId: startHereCategory.sections[0].id, 
            video: startHereCategory.sections[0].videos[0] 
          })
        }
      }
    }
  }, [categories, selectedVideo])
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, any[]>>({})
  const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<{ type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string } | null>(null)
  const [editValues, setEditValues] = useState<any>({})

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleVideoSelect = (moduleId: number, video: Video) => {
    // Immediately update state to make switch feel instant
    setSelectedVideo({ moduleId, video })
  }

  const handleSaveEdit = async () => {
    if (!editing) return

    try {
      // Extract YouTube/Loom IDs from URLs if provided
      const extractYouTubeId = (url: string) => {
        if (!url) return ''
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
        if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
        if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
        return url
      }

      const extractLoomId = (url: string) => {
        if (!url) return ''
        const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
        return match ? match[1] : url
      }

      const updateData: any = {}
      if (editing.type === 'category') {
        updateData.title = editValues.title
      } else if (editing.type === 'section') {
        updateData.title = editValues.title
        updateData.description = editValues.description
      } else if (editing.type === 'video') {
        updateData.title = editValues.title
        if (editValues.youtubeId) updateData.youtubeId = extractYouTubeId(editValues.youtubeId)
        if (editValues.loomId) updateData.loomId = extractLoomId(editValues.loomId)
      }

      // Save to database via API
      const res = await fetch('/api/admin/courses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editing.type,
          categoryId: editing.categoryId,
          sectionId: editing.sectionId,
          videoId: editing.videoId,
          updates: updateData
        })
      })

      if (res.ok) {
        // Reload page to reflect changes
        window.location.reload()
      } else {
        alert('Error saving changes')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving changes')
    }
  }

  const handleTitleChange = (videoId: string, newTitle: string) => {
    setVideoTitles(prev => ({ ...prev, [videoId]: newTitle }))
  }

  const handleNotesChange = (videoId: string, newNotes: string) => {
    setNotes(prev => ({ ...prev, [videoId]: newNotes }))
  }

  const fetchAttachments = async (videoId: string) => {
    if (loadingAttachments[videoId]) return
    setLoadingAttachments(prev => ({ ...prev, [videoId]: true }))
    try {
      const res = await fetch(`/api/courses/video-attachments?videoId=${videoId}&courseType=mindset`)
      const data = await res.json()
      if (res.ok && data.attachments) {
        setAttachments(prev => ({ ...prev, [videoId]: data.attachments }))
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoadingAttachments(prev => ({ ...prev, [videoId]: false }))
    }
  }

  const handleAddAttachment = async (videoId: string, files: FileList | null) => {
    if (!files || !isAdmin) return
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('videoId', videoId)
      formData.append('courseType', 'mindset')

      try {
        const res = await fetch('/api/courses/video-attachments', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (res.ok && data.attachment) {
          // Refresh attachments
          await fetchAttachments(videoId)
        } else {
          alert(data.error || 'Failed to upload attachment')
        }
      } catch (error) {
        console.error('Error uploading attachment:', error)
        alert('Failed to upload attachment')
      }
    }
  }

  const handleRemoveAttachment = async (videoId: string, attachmentId: string) => {
    if (!isAdmin) return
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const res = await fetch('/api/courses/video-attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId })
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh attachments
        await fetchAttachments(videoId)
      } else {
        alert(data.error || 'Failed to delete attachment')
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete attachment')
    }
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

  // Fetch attachments when video is selected
  useEffect(() => {
    if (selectedVideo?.video?.id) {
      fetchAttachments(selectedVideo.video.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.video?.id])

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Course Navigation */}
      <div className="w-80 bg-slate-800/30 rounded-xl border-2 border-slate-700/50 overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4">
        <div className="p-4 border-b-2 border-slate-700/50 shrink-0 bg-slate-900/30">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Course Modules</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {categories ? (
            categories.map((category) => {
              const isCategoryExpanded = expandedCategories.has(category.id)
              
              return (
                <div
                  key={category.id}
                  className="border-b-2 border-slate-600/50 last:border-b-0"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/30 ${
                      category.isStartHere 
                        ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 border-yellow-500/50' 
                        : 'bg-slate-900/40'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${category.isStartHere ? 'text-yellow-400' : 'text-slate-300'} transition-transform ${isCategoryExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      {editing?.type === 'category' && editing.categoryId === category.id ? (
                        <input
                          type="text"
                          value={editValues.title || category.title}
                          onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                          className="w-full px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-sm font-bold uppercase"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                      ) : (
                        <div className={`text-sm font-bold uppercase tracking-wide ${
                          category.isStartHere 
                            ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]' 
                            : 'text-white'
                        }`}>
                          {category.title}
                        </div>
                      )}
                    </div>
                    {editing?.type === 'category' && editing.categoryId === category.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {category.isStartHere && (
                          <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full border border-yellow-500/50">
                            ⭐ FIRST
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditing({ type: 'category', categoryId: category.id })
                              setEditValues({ title: category.title })
                            }}
                            className="p-1 text-slate-400 hover:text-white ml-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </button>

                  {/* Category Sections */}
                  {isCategoryExpanded && (
                    <div className="bg-slate-900/30">
                      {category.sections.map((section) => {
                        const isSectionExpanded = expandedSections.has(section.id)
                        
                        return (
                          <div
                            key={section.id}
                            className="border-b border-slate-700/30 last:border-b-0"
                          >
                            {/* Section Header */}
                            <button
                              onClick={() => toggleSection(section.id)}
                              className="w-full px-4 py-2.5 pl-8 flex items-center gap-3 text-left transition-colors bg-slate-900/20 hover:bg-slate-800/50"
                            >
                              <svg
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSectionExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                {editing?.type === 'section' && editing.sectionId === section.id ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={editValues.title || section.title}
                                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                      className="w-full px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs font-semibold"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit()
                                        if (e.key === 'Escape') setEditing(null)
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={editValues.description || section.description || ''}
                                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                      className="w-full px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                                      placeholder="Description"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-xs font-semibold truncate text-slate-200">
                                      {section.title}
                                    </div>
                                    <div className="text-xs text-slate-500">{section.videos.length} lessons</div>
                                  </>
                                )}
                              </div>
                              {editing?.type === 'section' && editing.sectionId === section.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1 text-emerald-400 hover:text-emerald-300"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="p-1 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditing({ type: 'section', categoryId: category.id, sectionId: section.id })
                                      setEditValues({ title: section.title, description: section.description })
                                    }}
                                    className="p-1 text-slate-400 hover:text-white"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )
                              )}
                            </button>

                            {/* Section Videos */}
                            {isSectionExpanded && (
                              <div className="bg-slate-900/50 border-t border-slate-700/30">
                                {section.videos.map((video, index) => {
                                  const isSelected = selectedVideo?.moduleId === section.id && selectedVideo?.video.id === video.id
                                  const displayTitle = getVideoTitle(video)
                                  const isLast = index === section.videos.length - 1
                                  return (
                                    <div
                                      key={video.id}
                                      className={`w-full px-4 py-2 pl-14 flex items-center gap-2 hover:bg-slate-800/50 transition-colors border-b border-slate-700/20 ${
                                        isLast ? 'border-b-0' : ''
                                      } ${
                                        isSelected ? 'bg-emerald-500/20 border-l-2 border-emerald-500' : ''
                                      }`}
                                    >
                                      {editing?.type === 'video' && editing.videoId === video.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={editValues.title || displayTitle}
                                            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                            className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit()
                                              if (e.key === 'Escape') setEditing(null)
                                            }}
                                          />
                                          <input
                                            type="text"
                                            value={editValues.youtubeId || video.youtubeId || ''}
                                            onChange={(e) => setEditValues({ ...editValues, youtubeId: e.target.value })}
                                            className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                                            placeholder="YouTube ID/URL"
                                          />
                                          <input
                                            type="text"
                                            value={editValues.loomId || video.loomId || ''}
                                            onChange={(e) => setEditValues({ ...editValues, loomId: e.target.value })}
                                            className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                                            placeholder="Loom ID/URL"
                                          />
                                          <button
                                            onClick={handleSaveEdit}
                                            className="p-1 text-emerald-400 hover:text-emerald-300"
                                          >
                                            <Save className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => setEditing(null)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleVideoSelect(section.id, video)}
                                            className="flex-1 text-left"
                                          >
                                            <div className="text-xs text-slate-300">{index + 1}. {displayTitle}</div>
                                          </button>
                                          {isAdmin && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setEditing({ type: 'video', categoryId: category.id, sectionId: section.id, videoId: video.id })
                                                setEditValues({ title: displayTitle, youtubeId: video.youtubeId, loomId: video.loomId })
                                              }}
                                              className="p-1 text-slate-400 hover:text-white"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            // Fallback to old structure if categories not provided
            modules.map((module) => {
              const isExpanded = expandedSections.has(module.id)
              
              return (
                <div
                  key={module.id}
                  className="border-b-2 border-slate-700/50 last:border-b-0"
                >
                  <button
                    onClick={() => toggleSection(module.id)}
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
                              isSelected ? 'bg-emerald-500/20 border-l-2 border-emerald-500' : ''
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
            })
          )}
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
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
              ) : selectedVideo.video.loomId ? (
                <iframe
                  key={`${selectedVideo.video.id}-${selectedVideo.video.loomId}`}
                  src={`https://www.loom.com/embed/${selectedVideo.video.loomId}`}
                  frameBorder="0"
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
                      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-300">Course Materials</h3>
                        {isAdmin && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              onChange={(e) => handleAddAttachment(selectedVideo.video.id, e.target.files)}
                            />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs text-slate-300 font-medium">Upload</span>
                            </div>
                          </label>
                        )}
                      </div>

                      {/* Attachments List */}
                      <div className="px-4 pb-4 pt-4">
                        {loadingAttachments[selectedVideo.video.id] ? (
                          <div className="text-sm text-slate-400 text-center py-4">Loading attachments...</div>
                        ) : getVideoAttachments(selectedVideo.video).length > 0 ? (
                          <div className="space-y-2">
                            {getVideoAttachments(selectedVideo.video).map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors"
                              >
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 flex-1 hover:text-emerald-400 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm text-slate-300">{attachment.display_name || attachment.file_name}</span>
                                  <svg className="w-3 h-3 text-slate-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemoveAttachment(selectedVideo.video.id, attachment.id)}
                                    className="ml-2 p-1 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Delete attachment"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 text-center py-4 italic">No course materials available</div>
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="border-t border-slate-700/50">
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
                              className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50"
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
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-slate-400">Select a video to start learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
