'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, Circle, Play, Download, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  title: string
  description: string
  emoji: string
  color: string
  sections: Section[]
}

interface Section {
  id: string
  title: string
  description: string
  sort_order: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  description: string
  video_url: string
  video_type: string
  duration_minutes: number
  sort_order: number
  progress?: {
    completed: boolean
    progress_percentage: number
  }
}

interface Attachment {
  id: string
  title?: string
  file_url: string
  file_name: string
  display_name?: string
  file_type?: string
  file_size?: number
}

export default function CourseDetailClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lessonNotes, setLessonNotes] = useState<string>('')
  const [lessonAttachments, setLessonAttachments] = useState<Attachment[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  useEffect(() => {
    fetchCourse()
  }, [slug])

  useEffect(() => {
    if (selectedLesson) {
      loadNotes()
      loadAttachments()
    } else {
      setLessonNotes('')
      setLessonAttachments([])
    }
  }, [selectedLesson])

  const loadNotes = async () => {
    if (!selectedLesson) return
    
    setLoadingNotes(true)
    try {
      const res = await fetch(`/api/courses-v2/lesson-notes?lessonId=${selectedLesson.id}`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        console.log('[CourseDetailClient] Notes loaded:', { lessonId: selectedLesson.id, notes: data.notes, hasNotes: !!data.notes })
        setLessonNotes(data.notes || '')
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[CourseDetailClient] Failed to load notes:', res.status, errorData)
        setLessonNotes('')
      }
    } catch (error) {
      console.error('[CourseDetailClient] Error loading notes:', error)
      setLessonNotes('')
    } finally {
      setLoadingNotes(false)
    }
  }

  const loadAttachments = async () => {
    if (!selectedLesson) return
    
    setLoadingAttachments(true)
    try {
      const res = await fetch(`/api/courses-v2/lesson-attachments?lessonId=${selectedLesson.id}`)
      if (res.ok) {
        const data = await res.json()
        setLessonAttachments(data.attachments || [])
      } else {
        setLessonAttachments([])
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
      setLessonAttachments([])
    } finally {
      setLoadingAttachments(false)
    }
  }

  const fetchCourse = async () => {
    try {
      console.log('Fetching course with slug:', slug)
      const res = await fetch(`/api/courses-v2?courseId=${encodeURIComponent(slug)}`)
      
      console.log('API response status:', res.status)
      
      if (res.status === 401) {
        // Not authenticated, redirect to login
        router.push('/login')
        return
      }
      
      const data = await res.json()
      console.log('API response data:', data)
      
      if (!res.ok) {
        setError(data.error || 'Course not found')
        setLoading(false)
        return
      }
      
      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }
      
      if (data.course) {
        setCourse(data.course)
        // Auto-select first lesson
        if (data.course.sections?.[0]?.lessons?.[0]) {
          setSelectedLesson(data.course.sections[0].lessons[0])
        }
      } else {
        setError('Course not found')
      }
    } catch (error) {
      console.error('Error fetching course:', error)
      setError('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-white text-xl">Loading course...</div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center flex-col gap-4">
        <div className="text-white text-xl">{error || 'Course not found'}</div>
        <Link href="/dashboard" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-white hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{course.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{course.title}</h1>
              {course.description && (
                <p className="text-[rgba(255,255,255,0.6)] text-sm">{course.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 flex flex-col bg-black">
          {selectedLesson ? (
            <>
              <div className="flex-1 flex items-center justify-center bg-black">
                {selectedLesson.video_type === 'youtube' && selectedLesson.video_url && (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(selectedLesson.video_url)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {selectedLesson.video_type === 'loom' && selectedLesson.video_url && (
                  <iframe
                    src={`https://www.loom.com/embed/${extractLoomId(selectedLesson.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                )}
                {!selectedLesson.video_url && (
                  <div className="text-white text-center">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No video available</p>
                  </div>
                )}
              </div>
              <div className="bg-[rgba(26,26,46,0.95)] p-6 border-t border-[rgba(255,255,255,0.1)] space-y-6 overflow-y-auto">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{selectedLesson.title}</h2>
                  {selectedLesson.description && (
                    <p className="text-[rgba(255,255,255,0.7)]">{selectedLesson.description}</p>
                  )}
                </div>

                {/* Notes Section - Always show if there are notes or if we're loading */}
                {(lessonNotes || loadingNotes) && (
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="p-4 border-b border-slate-700/50">
                      <h4 className="text-sm font-semibold text-slate-300">Notes</h4>
                    </div>
                    <div className="p-4">
                      {loadingNotes ? (
                        <div className="text-sm text-slate-400 text-center py-4">Loading notes...</div>
                      ) : lessonNotes && lessonNotes.trim() ? (
                        <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {lessonNotes}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic">No notes available</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Course Materials Section */}
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="p-4 border-b border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Course Materials
                    </h4>
                  </div>
                  <div className="p-4">
                    {loadingAttachments ? (
                      <div className="text-sm text-slate-400 text-center py-4">Loading attachments...</div>
                    ) : lessonAttachments.length > 0 ? (
                      <div className="space-y-2">
                        {lessonAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors"
                          >
                            <a
                              href={attachment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 hover:text-cyan-400 transition-colors"
                            >
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm text-slate-300">{attachment.display_name || attachment.title || attachment.file_name}</span>
                            </a>
                            <a
                              href={attachment.file_url}
                              download
                              className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 text-center py-4 italic">No course materials available</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a lesson to start</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Lessons */}
        <div className="w-96 bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-l border-[rgba(255,255,255,0.1)] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold text-white mb-4">Course Content</h3>
            
            {course.sections.map((section) => (
              <div key={section.id} className="mb-6">
                <h4 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
                  {section.title}
                </h4>
                <div className="space-y-2">
                  {section.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {lesson.progress?.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-[rgba(255,255,255,0.3)] shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-2">{lesson.title}</div>
                          {lesson.duration_minutes > 0 && (
                            <div className="text-xs opacity-60 mt-1">
                              {lesson.duration_minutes} min
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {course.sections.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[rgba(255,255,255,0.5)]">No lessons available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function extractYouTubeId(url: string): string {
  if (!url) return ''
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
  if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
  if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
  return url
}

function extractLoomId(url: string): string {
  const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
  return match ? match[1] : ''
}

