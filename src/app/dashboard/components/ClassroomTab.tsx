'use client'

import React from 'react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Course, Module, Lesson, Checkpoint } from '@/lib/types/courses'
import { fetchCourses, fetchCourseWithModules, fetchCheckpoints } from '@/lib/api/courses'
import { useAdmin } from '@/lib/hooks/useAdmin'
import { CourseSelector } from './classroom/CourseSelector'
import { ModuleCard } from './classroom/ModuleCard'
import { CheckpointGate } from './classroom/CheckpointGate'
import { SkillBankCourseView } from './classroom/SkillBankCourseView'
import { Settings, LogOut } from 'lucide-react'
import { MindsetModuleList } from '@/app/mindset/components/MindsetModuleList'
import { DreamJobModuleList } from '@/app/dreamjob/components/DreamJobModuleList'

// Helper function for glow shadow
const glowShadow = (shadows: string, glowIntensity: number) => {
  if (!glowIntensity || glowIntensity === 0) return 'none'
  const intensity = glowIntensity / 100
  const boosted = intensity * 0.69
  return shadows.split(', ').map(shadow => {
    return shadow.replace(/(\d+)px/g, (match, num) => {
      const val = parseInt(num)
      if (val > 8) {
        return `${Math.round(val * boosted)}px`
      }
      return match
    }).replace(/rgba?\(([^)]+)\)/g, (match, content) => {
      const parts = content.split(',')
      if (parts.length === 4) {
        const alpha = Math.min(1, parseFloat(parts[3].trim()) * boosted)
        return `rgba(${parts.slice(0,3).join(',')},${alpha.toFixed(2)})`
      }
      return match
    })
  }).join(', ')
}

interface ClassroomTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role?: string
  }
  activeTab: 'community' | 'classroom' | 'groupchat'
  setActiveTab: (tab: 'community' | 'classroom' | 'groupchat') => void
  glowIntensity: number
}

export default function ClassroomTab({
  affiliate,
  activeTab,
  setActiveTab,
  glowIntensity,
}: ClassroomTabProps): JSX.Element {
  console.log('[ClassroomTab] Component rendering/re-rendering')
  const isAdmin = useAdmin(affiliate)
  
  // Debug admin status
  useEffect(() => {
    console.log('[ClassroomTab] Admin status check:', {
      isAdmin,
      affiliateRole: affiliate?.role,
      affiliateId: affiliate?.id,
      isModerator: affiliate?.role === 'moderator'
    })
  }, [isAdmin, affiliate?.role, affiliate?.id])
  
  // Helper to generate slug from title
  const generateSlug = (title: string): string => {
    if (!title || typeof title !== 'string') {
      throw new Error('Title must be a non-empty string')
    }
    const timestamp = Date.now()
    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${timestamp}`
    
    if (!slug || slug.length === 0) {
      throw new Error('Generated slug is empty')
    }
    
    return slug
  }
  
  const [selectedWorld, setSelectedWorld] = useState<'mindset' | 'dreamjob' | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  
  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('[ClassroomTab] Component MOUNTED')
    return () => {
      console.log('[ClassroomTab] Component UNMOUNTING - state will be lost!')
    }
  }, [])
  
  // Debug: Log state changes
  useEffect(() => {
    console.log('[ClassroomTab] ===== STATE CHANGE =====')
    console.log('[ClassroomTab] selectedWorld:', selectedWorld, '(type:', typeof selectedWorld, ')')
    console.log('[ClassroomTab] selectedCourse:', selectedCourse ? {
      id: selectedCourse.id,
      slug: selectedCourse.slug,
      title: selectedCourse.title
    } : null)
    console.log('[ClassroomTab] Will render:', selectedWorld === 'mindset' ? 'MINDSET (OLD UI)' : selectedWorld === 'dreamjob' ? 'DREAMJOB (OLD UI)' : selectedCourse ? 'COURSE: ' + selectedCourse.slug + ' (SKILLBANK VIEW)' : 'SELECTOR')
    console.log('[ClassroomTab] Conditional checks:')
    console.log('[ClassroomTab]   selectedWorld === "mindset":', selectedWorld === 'mindset')
    console.log('[ClassroomTab]   selectedWorld === "dreamjob":', selectedWorld === 'dreamjob')
    console.log('[ClassroomTab]   selectedCourse exists:', !!selectedCourse)
    console.log('[ClassroomTab]   !selectedWorld && !selectedCourse:', !selectedWorld && !selectedCourse)
    console.log('[ClassroomTab] ========================')
  }, [selectedWorld, selectedCourse])
  
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [checkpointsByModule, setCheckpointsByModule] = useState<Record<string, Checkpoint>>({})
  const [loading, setLoading] = useState(true)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false)
  
  // Mindset and DreamJob data
  const [mindsetCategories, setMindsetCategories] = useState<any[]>([])
  const [mindsetModules, setMindsetModules] = useState<any[]>([])
  const [dreamJobModules, setDreamJobModules] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  // Helper functions for video URL extraction
  const extractLoomId = (url: string): string => {
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : ''
  }

  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
    return url
  }

  // Fetch all courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true)
        // Fetch courses - admins see drafts too
        const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
        console.log('[ClassroomTab] 🔄 Loading courses on mount from:', url)
        const res = await fetch(url)
        const data = await res.json()
        const loadedCourses = data.courses || []
        console.log('[ClassroomTab] 📚 Loaded courses count:', loadedCourses.length)
        console.log('[ClassroomTab] 📚 All loaded courses:', loadedCourses.map((c: Course) => ({ 
          slug: c.slug, 
          title: c.title, 
          id: c.id,
          is_published: (c as any).is_published 
        })))
        setCourses(loadedCourses)
      } catch (error) {
        console.error('[ClassroomTab] ❌ Error loading courses:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCourses()
  }, [isAdmin])

  // Fetch mindset data when selected
  useEffect(() => {
    console.log('[ClassroomTab] useEffect for mindset - selectedWorld:', selectedWorld)
    if (selectedWorld !== 'mindset') {
      console.log('[ClassroomTab] selectedWorld is not "mindset", clearing mindset data')
      setMindsetCategories([])
      setMindsetModules([])
      return
    }

    console.log('[ClassroomTab] selectedWorld is "mindset", starting fetch...')
    const loadMindsetData = async () => {
      try {
        console.log('[ClassroomTab] Setting loadingCourses to true')
        setLoadingCourses(true)
        console.log('[ClassroomTab] Fetching /api/courses/structure?courseType=mindset')
        const res = await fetch('/api/courses/structure?courseType=mindset')
        console.log('[ClassroomTab] Mindset API response status:', res.status, res.ok)
        if (res.ok) {
          const data = await res.json()
          console.log('[ClassroomTab] Mindset API response data:', data)
          if (data.categories) {
            console.log('[ClassroomTab] Setting mindsetCategories:', data.categories.length, 'categories')
            setMindsetCategories(data.categories)
          }
          // Build modules array from categories
          const modulesList: any[] = []
          data.categories?.forEach((category: any) => {
            category.sections?.forEach((section: any) => {
              modulesList.push({
                ...section,
                categoryId: category.id,
                categoryTitle: category.title
              })
            })
          })
          console.log('[ClassroomTab] Setting mindsetModules:', modulesList.length, 'modules')
          setMindsetModules(modulesList)
        } else {
          console.error('[ClassroomTab] Mindset API response not OK:', res.status, await res.text())
        }
      } catch (error) {
        console.error('[ClassroomTab] Error loading mindset data:', error)
      } finally {
        console.log('[ClassroomTab] Setting loadingCourses to false')
        setLoadingCourses(false)
      }
    }

    loadMindsetData()
  }, [selectedWorld])

  // Fetch dreamjob data when selected
  useEffect(() => {
    console.log('[ClassroomTab] useEffect for dreamjob - selectedWorld:', selectedWorld)
    if (selectedWorld !== 'dreamjob') {
      console.log('[ClassroomTab] selectedWorld is not "dreamjob", clearing dreamjob data')
      setDreamJobModules([])
      return
    }

    console.log('[ClassroomTab] selectedWorld is "dreamjob", starting fetch...')
    const loadDreamJobData = async () => {
      try {
        console.log('[ClassroomTab] Setting loadingCourses to true')
        setLoadingCourses(true)
        console.log('[ClassroomTab] Fetching /api/courses/structure?courseType=dreamjob')
        const res = await fetch('/api/courses/structure?courseType=dreamjob')
        console.log('[ClassroomTab] DreamJob API response status:', res.status, res.ok)
        if (res.ok) {
          const data = await res.json()
          console.log('[ClassroomTab] DreamJob API response data:', data)
          // DreamJob API returns { modules: [...] } directly (not categories)
          if (data.modules && Array.isArray(data.modules)) {
            console.log('[ClassroomTab] Setting dreamJobModules:', data.modules.length, 'modules')
            setDreamJobModules(data.modules)
          } else if (data.categories && Array.isArray(data.categories)) {
            // Fallback: if API returns categories, parse them
            const modulesList: any[] = []
            data.categories.forEach((category: any) => {
              if (category.sections && Array.isArray(category.sections)) {
                category.sections.forEach((section: any) => {
                  modulesList.push({
                    id: section.number || section.id,
                    uuid: section.uuid || section.id,
                    number: section.number || 0,
                    title: section.title || '',
                    description: section.description || '',
                    videos: (section.videos || []).map((video: any) => ({
                      id: video.id || video.video_id,
                      uuid: video.uuid,
                      title: video.title || '',
                      youtubeId: video.youtube_id || video.youtubeId,
                      loomId: video.loom_id || video.loomId,
                    })),
                  })
                })
              }
            })
            console.log('[ClassroomTab] Setting dreamJobModules (from categories):', modulesList.length, 'modules')
            setDreamJobModules(modulesList)
          } else {
            console.warn('[ClassroomTab] DreamJob API returned unexpected structure:', data)
            setDreamJobModules([])
          }
        } else {
          console.error('[ClassroomTab] DreamJob API response not OK:', res.status, await res.text())
        }
      } catch (error) {
        console.error('[ClassroomTab] Error loading dreamjob data:', error)
      } finally {
        console.log('[ClassroomTab] Setting loadingCourses to false')
        setLoadingCourses(false)
      }
    }

    loadDreamJobData()
  }, [selectedWorld])

  // Fetch course details when selected
  useEffect(() => {
    if (!selectedCourse) {
      setModules([])
      setLessons({})
      setCheckpoints([])
      return
    }

    const loadCourseDetails = async () => {
      try {
        setLoading(true)
        const { course, modules: courseModules } = await fetchCourseWithModules(selectedCourse.id)
        setModules(courseModules)
        
        // Auto-expand first module
        if (courseModules.length > 0) {
          setExpandedModules(new Set([courseModules[0].id]))
        }

        // Fetch lessons for each module
        const lessonsMap: Record<string, Lesson[]> = {}
        for (const module of courseModules) {
          try {
            const res = await fetch(`/api/courses-v2/${selectedCourse.id}/sections/${module.id}/lessons`)
            if (res.ok) {
              const data = await res.json()
              lessonsMap[module.id] = data.lessons || []
            }
          } catch (error) {
            console.error(`Error fetching lessons for module ${module.id}:`, error)
            lessonsMap[module.id] = []
          }
        }
        setLessons(lessonsMap)

        // Fetch checkpoints
        const courseCheckpoints = await fetchCheckpoints(selectedCourse.id)
        setCheckpoints(courseCheckpoints)
        
        // Build checkpoint map by module ID
        const checkpointMap: Record<string, Checkpoint> = {}
        courseCheckpoints.forEach(cp => {
          if (cp.after_module_id) {
            checkpointMap[cp.after_module_id] = cp
          }
        })
        setCheckpointsByModule(checkpointMap)
      } catch (error) {
        console.error('Error loading course details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourseDetails()
  }, [selectedCourse])

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }, [])

  return (
    <React.Fragment>
      <div 
        className="flex h-full w-full" 
        style={{ 
          display: 'flex', 
          width: '100%', 
          height: '100%', 
          boxSizing: 'border-box', 
          margin: 0, 
          padding: 0, 
          gap: 0, 
          backgroundColor: '#0f0f1a' 
        }}
      >
      {/* Sidebar - Match CommunityTab styling - Always visible */}
      <div className="w-[250px] text-white flex flex-col shrink-0 h-full relative" style={{ width: '250px', minWidth: '250px', flexShrink: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', height: '100%', zIndex: 100 }}>
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
              border: '2px solid rgba(168,85,247,0.6)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.1),
                inset 0 -1px 2px rgba(0,0,0,0.9),
                0 2px 8px rgba(0,0,0,0.8),
                0 0 1px rgba(168,85,247,0.5),
                0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.4)
              `
            }}>
              <div className="absolute inset-0 opacity-20" style={{
                background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(168,85,247,0.1) 2px, rgba(168,85,247,0.1) 4px)',
                backgroundSize: '8px 100%'
              }} />
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 relative z-10" style={{
                filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8)) drop-shadow(0 0 8px rgba(168,85,247,0.6))',
              }}>
                <path d="M13 2L3 14h12v8l10-12H13V2z" fill="rgba(168,85,247,0.9)" stroke="rgba(168,85,247,0.9)" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm">LifeDesign</div>
              <div className="text-[10px] text-slate-400">2,847 members</div>
            </div>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-[rgba(255,255,255,0.6)] mb-3 font-semibold uppercase tracking-wider px-2">Navigation</div>
          {[
            { id: 'community', icon: '💬', label: 'Community' },
            { id: 'classroom', icon: '📚', label: 'Classroom' },
            { id: 'members', icon: '👥', label: 'Members' },
            ...(isAdmin 
              ? [{ id: 'admin', icon: '⚙️', label: 'Admin', href: '/community/admin' }]
              : []
            ),
          ].map(item => {
            const hasHref = !!(item as any).href
            const isActive = activeTab === (item.id as any) || item.id === 'members' || item.id === 'admin'
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'community' || item.id === 'classroom') {
                    setActiveTab(item.id as 'community' | 'classroom')
                  } else if (hasHref) {
                    window.location.href = (item as any).href
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all ${
                  activeTab === item.id
                    ? 'text-white'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
                style={activeTab === item.id ? {
                  background: 'linear-gradient(135deg, #fde047, #facc15)',
                  boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
                } : {}}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.id === 'community' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }}>
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M7 9h10M7 13h6" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === 'classroom' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }}>
                      <path d="M12 2L12 22" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M8 6L12 2L16 6" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                        }}
                      />
                      <path d="M10 18L12 22L14 18" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                        }}
                      />
                    </svg>
                  )}
                  {item.id === 'members' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <circle cx="9" cy="7" r="4" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" 
                        stroke="rgba(34,211,238,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === 'admin' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <circle cx="12" cy="12" r="3" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                          stroke: 'rgba(34,211,238,0.9)'
                        }}
                      />
                      <path d="M12 1v6m0 6v6M1 12h6m6 0h6" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                      <path d="M19.07 4.93l-4.24 4.24m0 5.66l4.24 4.24M4.93 19.07l4.24-4.24m0-5.66L4.93 4.93" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setActiveTab('groupchat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all relative ${
                activeTab === 'groupchat'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white'
              }`}
              style={activeTab === 'groupchat' ? {
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.1),
                  inset 0 -1px 2px rgba(0,0,0,0.9),
                  0 2px 8px rgba(0,0,0,0.8),
                  0 0 1px rgba(34,211,238,0.5),
                  ${glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)}
                `,
                color: 'rgba(34,211,238,0.95)',
                textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
              } : {
                background: 'transparent',
                border: '1px solid transparent'
              }}
            >
              <div className="w-5 h-5 flex items-center justify-center relative">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                    stroke="rgba(255,255,255,0.9)" 
                    strokeWidth="1.5" 
                    fill="rgba(60,60,60,0.8)"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                    }}
                  />
                  <path d="M7 9h10M7 13h6" 
                    stroke="rgba(255,255,255,0.9)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute -bottom-0.5 -right-0.5 text-[6px] font-bold leading-none" style={{
                  color: '#fde047',
                  textShadow: '0 0 3px rgba(253,224,71,0.8), 0 1px 1px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 2px rgba(253,224,71,0.6))',
                  background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                  padding: '1px 2px',
                  borderRadius: '2px',
                  border: '0.5px solid rgba(253,224,71,0.3)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.9)'
                }}>
                  ld
                </div>
              </div>
              <span className="font-medium">Group Chat</span>
              <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
          </div>

          <div className="mt-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-4 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="text-xs font-semibold mb-2 text-white">Your Progress</div>
            <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full mb-2 overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{
                  width: '42%',
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  boxShadow: glowShadow('0 0 12px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.6)', glowIntensity)
                }}
              />
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.6)]">15 of 36 lessons completed</div>
          </div>
        </div>

        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px]" style={{ backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3 mb-3">
            {affiliate.avatar_url ? (
              <img 
                src={affiliate.avatar_url} 
                alt={affiliate.avatar_name || affiliate.name} 
                className="w-10 h-10 rounded-full border-2"
                style={{
                  borderColor: 'rgba(34,211,238,0.5)',
                  boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  borderColor: 'rgba(34,211,238,0.5)',
                  boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                }}
              >
                <span className="text-white">{(affiliate.avatar_name || affiliate.name).substring(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-white">{affiliate.avatar_name || affiliate.name}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.6)]">Member</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-white" />
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative" style={{ flex: 1, minWidth: 0, height: '100%', margin: 0, padding: 0, boxSizing: 'border-box', overflow: 'hidden', zIndex: 1 }}>
        {/* Content Overlay */}
        <div className="relative flex-1 flex flex-col overflow-hidden" style={{ zIndex: 1 }}>
          {/* Color Splash Header - Only in main content area, contained */}
          <div 
            className="absolute top-0 left-0 right-0 h-[300px]"
            style={{
              background: 'linear-gradient(135deg, #fde047 0%, #fde047 25%, #f472b6 25%, #f472b6 50%, #22d3ee 50%, #22d3ee 75%, #0ea5e9 75%, #0ea5e9 100%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(15,15,26,0.5)] to-[#0f0f1a]" />
          </div>

          <div className="h-14 bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 relative z-10" style={{ backdropFilter: 'blur(20px)' }}>
            <div>
              <h1 className="text-lg font-bold text-white">Classroom</h1>
              <p className="text-xs text-[rgba(255,255,255,0.6)]">don't just watch. ENACT the lessons IRL. Make your life ACTUALLY better &lt;3</p>
            </div>
            {(selectedWorld || selectedCourse) && (
              <button
                onClick={() => {
                  setSelectedWorld(null)
                  setSelectedCourse(null)
                  setSelectedLesson(null)
                  setExpandedModules(new Set())
                }}
                className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                ← Back to Courses
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 w-full relative z-10" style={{ width: '100%', flex: 1, minWidth: 0, boxSizing: 'border-box', margin: 0, padding: 0 }}>
            {loading ? (
              <div className="text-center py-12 text-white">Loading...</div>
            ) : !selectedWorld && !selectedCourse ? (
              <div className="px-4 sm:px-6 lg:px-8 py-8">
                <CourseSelector
                  courses={courses}
                  glowIntensity={glowIntensity}
                  isAdmin={isAdmin}
                  onSelectCourse={(course) => {
                    console.log('[ClassroomTab] 🎯 onSelectCourse called with:', {
                      id: course.id,
                      slug: course.slug,
                      title: course.title
                    })
                    console.log('[ClassroomTab] 🎯 Setting selectedCourse and clearing selectedWorld')
                    setSelectedCourse(course)
                    setSelectedWorld(null)
                    console.log('[ClassroomTab] 🎯 State should now be: selectedCourse=' + course.slug + ', selectedWorld=null')
                  }}
                  onSelectMindset={async () => {
                    console.log('[ClassroomTab] 🔵 onSelectMindset called')
                    console.log('[ClassroomTab] Current courses count:', courses.length)
                    console.log('[ClassroomTab] Current courses:', courses.map(c => ({ slug: c.slug, title: c.title, id: c.id })))
                    
                    // Always fetch fresh courses to ensure we have the latest
                    try {
                      const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
                      console.log('[ClassroomTab] Fetching courses from:', url)
                      const res = await fetch(url)
                      const data = await res.json()
                      const allCourses = data.courses || []
                      console.log('[ClassroomTab] 📦 Fetched courses count:', allCourses.length)
                      console.log('[ClassroomTab] 📦 All fetched courses:', allCourses.map((c: Course) => ({ slug: c.slug, title: c.title, id: c.id, is_published: (c as any).is_published })))
                      
                      setCourses(allCourses)
                      
                      // Try multiple slug variations
                      let mindsetCourse = allCourses.find((c: Course) => c.slug === 'mindset')
                      if (!mindsetCourse) {
                        mindsetCourse = allCourses.find((c: Course) => c.slug === 'mindset-foundations')
                      }
                      if (!mindsetCourse) {
                        mindsetCourse = allCourses.find((c: Course) => (c as any).title?.toLowerCase().includes('mindset'))
                      }
                      
                      if (mindsetCourse) {
                        console.log('[ClassroomTab] ✅ FOUND MINDSET COURSE!', {
                          id: mindsetCourse.id,
                          slug: mindsetCourse.slug,
                          title: mindsetCourse.title
                        })
                        console.log('[ClassroomTab] Setting selectedCourse and clearing selectedWorld')
                        setSelectedCourse(mindsetCourse)
                        setSelectedWorld(null) // Clear old state
                        console.log('[ClassroomTab] ✅ State updated - should render SkillBankCourseView')
                      } else {
                        console.error('[ClassroomTab] ❌ Mindset course NOT FOUND!')
                        console.error('[ClassroomTab] Available slugs:', allCourses.map((c: Course) => c.slug))
                        console.error('[ClassroomTab] Falling back to old UI')
                        setSelectedWorld('mindset')
                      }
                    } catch (error) {
                      console.error('[ClassroomTab] ❌ Error fetching courses:', error)
                      alert('Error loading courses. Please try again.')
                      setSelectedWorld('mindset') // Fallback
                    }
                  }}
                  onSelectDreamJob={async () => {
                    console.log('[ClassroomTab] 🔵 onSelectDreamJob called')
                    console.log('[ClassroomTab] Current courses count:', courses.length)
                    console.log('[ClassroomTab] Current courses:', courses.map(c => ({ slug: c.slug, title: c.title, id: c.id })))
                    
                    // Always fetch fresh courses to ensure we have the latest
                    try {
                      const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
                      console.log('[ClassroomTab] Fetching courses from:', url)
                      const res = await fetch(url)
                      const data = await res.json()
                      const allCourses = data.courses || []
                      console.log('[ClassroomTab] 📦 Fetched courses count:', allCourses.length)
                      console.log('[ClassroomTab] 📦 All fetched courses:', allCourses.map((c: Course) => ({ slug: c.slug, title: c.title, id: c.id, is_published: (c as any).is_published })))
                      
                      setCourses(allCourses)
                      
                      // Try multiple slug variations
                      let dreamJobCourse = allCourses.find((c: Course) => c.slug === 'dream-job')
                      if (!dreamJobCourse) {
                        dreamJobCourse = allCourses.find((c: Course) => c.slug === 'dreamjob')
                      }
                      if (!dreamJobCourse) {
                        dreamJobCourse = allCourses.find((c: Course) => (c as any).title?.toLowerCase().includes('dream job'))
                      }
                      
                      if (dreamJobCourse) {
                        console.log('[ClassroomTab] ✅ FOUND DREAMJOB COURSE!', {
                          id: dreamJobCourse.id,
                          slug: dreamJobCourse.slug,
                          title: dreamJobCourse.title
                        })
                        console.log('[ClassroomTab] Setting selectedCourse and clearing selectedWorld')
                        setSelectedCourse(dreamJobCourse)
                        setSelectedWorld(null) // Clear old state
                        console.log('[ClassroomTab] ✅ State updated - should render SkillBankCourseView')
                      } else {
                        console.error('[ClassroomTab] ❌ DreamJob course NOT FOUND!')
                        console.error('[ClassroomTab] Available slugs:', allCourses.map((c: Course) => c.slug))
                        console.error('[ClassroomTab] Falling back to old UI')
                        setSelectedWorld('dreamjob')
                      }
                    } catch (error) {
                      console.error('[ClassroomTab] ❌ Error fetching courses:', error)
                      alert('Error loading courses. Please try again.')
                      setSelectedWorld('dreamjob') // Fallback
                    }
                  }}
                  onCourseDeleted={async () => {
                    try {
                      const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
                      const res = await fetch(url)
                      const data = await res.json()
                      if (data.courses) {
                        setCourses(data.courses)
                        setSelectedCourse(null)
                      }
                    } catch (error) {
                      console.error('Error refetching courses:', error)
                    }
                  }}
                  onAddCourse={async () => {
                    try {
                      const title = 'New Course'
                      const slug = generateSlug(title)
                      
                      // Validate before sending
                      if (!title || !slug) {
                        console.error('[ClassroomTab] Validation failed:', { title, slug })
                        alert('Error: Title and slug are required')
                        return
                      }
                      
                      console.log('[ClassroomTab] Creating new course:', { title, slug, titleType: typeof title, slugType: typeof slug })
                      
                      const requestBody = {
                        title: title.trim(),
                        slug: slug.trim(),
                        description: '',
                        emoji: '📚',
                        color: '#06B6D4'
                      }
                      
                      console.log('[ClassroomTab] Request body:', requestBody)
                      
                      const res = await fetch('/api/courses-v2', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                      })
                      
                      const data = await res.json()
                      console.log('[ClassroomTab] Course creation response:', data)
                      
                      if (data.error) {
                        console.error('[ClassroomTab] Error creating course:', data.error)
                        alert('Error creating course: ' + data.error)
                        return
                      }
                      
                      if (!data.course && !data.id) {
                        console.error('[ClassroomTab] No course returned from API')
                        alert('Failed to create course: No course data returned')
                        return
                      }
                      
                      // Refetch courses to show the new one
                      const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
                      const coursesRes = await fetch(url)
                      const coursesData = await coursesRes.json()
                      
                      if (coursesData.courses) {
                        console.log('[ClassroomTab] Refetched courses:', coursesData.courses.length)
                        setCourses(coursesData.courses)
                        
                        // Auto-select the new course if it was created
                        if (data.course) {
                          setSelectedCourse(data.course)
                        } else if (data.id) {
                          // Find the course by ID
                          const newCourse = coursesData.courses.find((c: Course) => c.id === data.id)
                          if (newCourse) {
                            setSelectedCourse(newCourse)
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error('[ClassroomTab] Error creating course:', error)
                      alert('Failed to create course: ' + (error.message || 'Unknown error'))
                    }
                  }}
                />
              </div>
            ) : selectedCourse ? (
              // Use SkillBankCourseView for ALL courses (including foundational)
              // Foundational courses (mindset, dream-job) can now be edited using the same editor
              // The isAdmin prop controls editing permissions within the component
              <SkillBankCourseView
                course={selectedCourse}
                isAdmin={isAdmin}
                onBack={() => {
                  console.log('[ClassroomTab] 🔙 Back button clicked, clearing selectedCourse')
                  setSelectedCourse(null)
                  setSelectedWorld(null) // Clear both
                }}
                onPublish={async () => {
                  // Refetch courses after publishing
                  const url = isAdmin ? '/api/courses-v2?all=true' : '/api/courses-v2'
                  const res = await fetch(url)
                  const data = await res.json()
                  if (data.courses) {
                    setCourses(data.courses)
                  }
                }}
                glowIntensity={glowIntensity}
              />
            ) : selectedWorld === 'mindset' ? (
              loadingCourses ? (
                <div className="text-center py-12 text-white">Loading courses...</div>
              ) : mindsetCategories.length === 0 ? (
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center py-12">
                    <div className="inline-block bg-[rgba(255,255,255,0.06)] backdrop-blur-[10px] rounded-2xl p-8 border border-[rgba(255,255,255,0.12)] max-w-xl">
                      <h2 className="text-xl font-semibold text-white mb-2">Course not configured yet</h2>
                      <p className="text-[rgba(255,255,255,0.65)] text-sm">
                        The classroom now uses <span className="text-white">only</span> the database-backed course structure.
                        Add categories/sections/videos in the admin course editor and this will populate automatically.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                  <MindsetModuleList 
                    modules={mindsetModules} 
                    categories={mindsetCategories}
                    affiliate={affiliate}
                    onDataChange={async () => {
                    // Refetch data after drag operation
                    try {
                      const res = await fetch('/api/courses/structure?courseType=mindset')
                      const data = await res.json()
                      if (data.categories) {
                        setMindsetCategories(data.categories)
                      }
                      const modulesList: any[] = []
                      data.categories?.forEach((category: any) => {
                        category.sections?.forEach((section: any) => {
                          modulesList.push({
                            ...section,
                            categoryId: category.id,
                            categoryTitle: category.title
                          })
                        })
                      })
                      setMindsetModules(modulesList)
                    } catch (error) {
                      console.error('Error refetching mindset data:', error)
                    }
                  }}
                />
                </div>
              )
            ) : selectedWorld === 'dreamjob' ? (
              loadingCourses ? (
                <div className="text-center py-12 text-white">Loading courses...</div>
              ) : dreamJobModules.length === 0 ? (
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center py-12">
                    <div className="inline-block bg-[rgba(255,255,255,0.06)] backdrop-blur-[10px] rounded-2xl p-8 border border-[rgba(255,255,255,0.12)] max-w-xl">
                      <h2 className="text-xl font-semibold text-white mb-2">Dream Job course not configured yet</h2>
                      <p className="text-[rgba(255,255,255,0.65)] text-sm">
                        This course now loads from the database only. Add modules/lessons in the admin course editor to publish content here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                  <DreamJobModuleList 
                    modules={dreamJobModules} 
                    affiliate={affiliate}
                    onVideoSelect={() => {}}
                    onDataChange={async () => {
                    // Refetch data after drag operation
                    try {
                      const res = await fetch('/api/courses/structure?courseType=dreamjob')
                      const data = await res.json()
                      // DreamJob API returns { modules: [...] } directly
                      if (data.modules && Array.isArray(data.modules)) {
                        setDreamJobModules(data.modules)
                      } else {
                        console.warn('[ClassroomTab] DreamJob refetch returned unexpected structure:', data)
                      }
                    } catch (error) {
                      console.error('Error refetching dreamjob data:', error)
                    }
                  }}
                />
                </div>
              )
            ) : selectedWorld ? (
              // Fallback: Old foundational course UI (for backward compatibility)
              // This is triggered by clicking the old Mindset/DreamJob buttons
              <div className="flex gap-6">
                {/* Left Sidebar - Course Navigation */}
                <div className="w-80 rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4" style={{
                  background: 'linear-gradient(135deg, rgba(35,35,40,0.95) 0%, rgba(30,30,35,0.98) 50%, rgba(25,25,30,0.95) 100%)',
                  border: '1px solid rgba(70,70,75,0.6)',
                  boxShadow: `
                    inset 0 1px 1px rgba(255,255,255,0.05),
                    inset 0 -1px 1px rgba(0,0,0,0.8),
                    0 2px 8px rgba(0,0,0,0.6)
                  `
                }}>
                  <div className="p-3 shrink-0 border-b" style={{
                    borderColor: 'rgba(34,211,238,0.2)',
                    background: 'linear-gradient(135deg, rgba(40,40,45,0.9) 0%, rgba(35,35,40,0.95) 100%)'
                  }}>
                    <h3 className="text-xs font-semibold uppercase tracking-widest" style={{
                      color: 'rgba(34,211,238,0.9)',
                      textShadow: '0 0 8px rgba(34,211,238,0.4)'
                    }}>
                      {selectedWorld === 'mindset' ? 'LIFEDESIGN SYSTEM' : selectedWorld === 'dreamjob' ? 'DREAM JOB SYSTEM' : 'COURSE MODULES'}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {modules.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">No content yet</div>
                    ) : (
                      <div>
                        {modules.map((module) => {
                          const moduleLessons = lessons[module.id] || []
                          const isExpanded = expandedModules.has(module.id)
                          // Check if module is locked (has checkpoint before it that's not approved)
                          const moduleCheckpoint = checkpointsByModule[module.id]
                          const isLocked = false // TODO: Implement checkpoint locking logic based on user checkpoint status
                          
                          return (
                            <ModuleCard
                              key={module.id}
                              module={module}
                              lessons={moduleLessons}
                              isAdmin={isAdmin}
                              isExpanded={isExpanded}
                              isLocked={isLocked}
                              onToggleExpand={() => toggleModule(module.id)}
                              onSelectLesson={(lesson) => {
                                setSelectedLesson(lesson)
                                setSelectedModuleId(module.id)
                              }}
                              selectedLessonId={selectedLesson?.id}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Main Content - Video Player */}
                <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                  {selectedLesson ? (
                    <div className="space-y-0">
                      {/* Video Player */}
                      <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
                        {(selectedLesson as any).video_type === 'youtube' && selectedLesson.video_url && (
                          <iframe
                            key={`${selectedLesson.id}-${extractYouTubeId(selectedLesson.video_url)}`}
                            src={`https://www.youtube.com/embed/${extractYouTubeId(selectedLesson.video_url)}?rel=0`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full absolute inset-0"
                            title={selectedLesson.title}
                            loading="eager"
                          />
                        )}
                        {(selectedLesson as any).video_type === 'loom' && selectedLesson.video_url && (
                          <iframe
                            key={`${selectedLesson.id}-${extractLoomId(selectedLesson.video_url)}`}
                            src={`https://www.loom.com/embed/${extractLoomId(selectedLesson.video_url)}`}
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full absolute inset-0"
                            title={selectedLesson.title}
                            loading="eager"
                          />
                        )}
                        {!selectedLesson.video_url && (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-slate-400">Video URL not available</p>
                          </div>
                        )}
                      </div>

                      {/* Video Info & Description */}
                      <div className="p-6 space-y-6 relative z-0">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">{selectedLesson.title}</h3>
                          {selectedLesson.description && (
                            <p className="text-slate-300 text-sm leading-relaxed">{selectedLesson.description}</p>
                          )}
                        </div>

                        {/* Checkpoint Gate */}
                        {selectedModuleId && checkpointsByModule[selectedModuleId] && (
                          <CheckpointGate
                            checkpoint={checkpointsByModule[selectedModuleId]}
                            onSubmit={async (text: string) => {
                              // TODO: Implement checkpoint submission
                              console.log('Submitting checkpoint:', text)
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center">
                        <p className="text-slate-400">Select a lesson to start</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
    </React.Fragment>
  )
}
