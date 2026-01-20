'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, Circle, Play } from 'lucide-react'
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
  title: string
  file_url: string
  file_type?: string
  file_size?: number
}

export default function CourseDetailClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lessonAttachments, setLessonAttachments] = useState<Attachment[]>([])

  useEffect(() => {
    fetchCourse()
  }, [slug])

  useEffect(() => {
    if (selectedLesson) {
      loadLessonAttachments()
    } else {
      setLessonAttachments([])
    }
  }, [selectedLesson])

  const loadLessonAttachments = async () => {
    if (!selectedLesson) return
    
    try {
      const res = await fetch(`/api/courses-v2/lesson-attachments?lessonId=${selectedLesson.id}`)
      const data = await res.json()
      if (data.attachments) {
        setLessonAttachments(data.attachments)
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
      setLessonAttachments([])
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
              <div className="flex-1 flex items-center justify-center bg-black p-4">
                <div className="w-full max-w-4xl aspect-video">
                  {selectedLesson.video_type === 'youtube' && selectedLesson.video_url && (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(selectedLesson.video_url)}`}
                      className="w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  {selectedLesson.video_type === 'loom' && selectedLesson.video_url && (
                    <iframe
                      src={`https://www.loom.com/embed/${extractLoomId(selectedLesson.video_url)}`}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  )}
                  {!selectedLesson.video_url && (
                    <div className="w-full h-full flex items-center justify-center text-white text-center">
                      <div>
                        <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No video available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-[rgba(26,26,46,0.95)] p-6 border-t border-[rgba(255,255,255,0.1)]">
                <h2 className="text-xl font-bold text-white mb-2">{selectedLesson.title}</h2>
                {selectedLesson.description && (
                  <p className="text-[rgba(255,255,255,0.7)] mb-4">{selectedLesson.description}</p>
                )}
                
                {/* Attachments */}
                {lessonAttachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-[rgba(255,255,255,0.8)] mb-3">Attachments</h4>
                    <div className="space-y-2">
                      {lessonAttachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                        >
                          <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-sm text-[rgba(255,255,255,0.9)] flex-1 truncate">
                            {attachment.title || 'Untitled'}
                          </span>
                          {attachment.file_size && (
                            <span className="text-xs text-[rgba(255,255,255,0.5)] flex-shrink-0">
                              ({(attachment.file_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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

