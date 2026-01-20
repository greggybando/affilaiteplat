'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Course } from '@/lib/types/courses'
import { Plus, MoreVertical, Trash2 } from 'lucide-react'

interface CourseSelectorProps {
  courses: Course[]
  glowIntensity: number
  isAdmin: boolean
  onSelectCourse?: (course: Course) => void
  onSelectMindset: () => void
  onSelectDreamJob: () => void
  onAddCourse?: () => void
  onCourseDeleted?: () => void
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `${r},${g},${b}`
}

// Helper function for glow shadow
function glowShadow(shadows: string, glowIntensity: number): string {
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

export function CourseSelector({
  courses,
  glowIntensity,
  isAdmin,
  onSelectCourse,
  onSelectMindset,
  onSelectDreamJob,
  onAddCourse,
  onCourseDeleted
}: CourseSelectorProps) {
  console.log('[CourseSelector] RENDER - isAdmin:', isAdmin, 'courses:', courses.length)
  console.log('[CourseSelector] isAdmin type:', typeof isAdmin, 'value:', isAdmin)
  
  // Filter out foundation courses (mindset, dream-job, side-income)
  const skillbankCourses = courses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug))
  
  console.log('[CourseSelector] SkillBank courses:', skillbankCourses.length, 'isAdmin:', isAdmin)
  
  console.log('[CourseSelector] SkillBank courses:', skillbankCourses.length, 'isAdmin:', isAdmin)
  
  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.values(menuRefs.current).forEach((ref) => {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      })
    }
    
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])
  
  const handleDeleteCourse = async (courseId: string, courseTitle: string, e: React.MouseEvent) => {
    // Prevent any event bubbling
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    console.log('[CourseSelector] 🔴 handleDeleteCourse CALLED:', { courseId, courseTitle, courseIdType: typeof courseId })
    
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.error('[CourseSelector] ❌ INVALID courseId:', courseId)
      alert('Error: Invalid course ID')
      return
    }
    
    const confirmed = confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)
    if (!confirmed) {
      console.log('[CourseSelector] User cancelled')
      return
    }
    
    console.log('[CourseSelector] ✅ User confirmed, starting delete...')
    
    try {
      // Use simple query parameter approach
      const url = `/api/courses-v2?id=${encodeURIComponent(courseId)}`
      console.log('[CourseSelector] 🌐 DELETE URL:', url)
      
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      console.log('[CourseSelector] 📡 Response status:', res.status, res.statusText)
      
      const text = await res.text()
      console.log('[CourseSelector] 📄 Response text:', text)
      
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error('[CourseSelector] Parse error:', e)
      }
      
      if (!res.ok) {
        console.error('[CourseSelector] ❌ Delete failed:', res.status, data)
        alert(`Failed to delete: ${data.error || res.statusText || 'Unknown error'}`)
        return
      }
      
      console.log('[CourseSelector] ✅ Delete SUCCESS:', data)
      
      // Refresh courses
      if (onCourseDeleted) {
        console.log('[CourseSelector] 🔄 Refreshing course list...')
        await onCourseDeleted()
      }
      
      alert('Course deleted successfully!')
    } catch (error: any) {
      console.error('[CourseSelector] 💥 Exception:', error)
      alert(`Error: ${error.message || 'Failed to delete course'}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Financial Foundation Section */}
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-white mb-2">Building Your Financial Foundation</h1>
        <p className="text-[rgba(255,255,255,0.6)] text-lg mb-8">Start with these core courses</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mindset & Foundations */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('[CourseSelector] Mindset button clicked, calling onSelectMindset')
              onSelectMindset()
            }}
            className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-emerald-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
            style={{
              backdropFilter: 'blur(10px)',
              boxShadow: glowShadow('0 0 30px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.2)', glowIntensity)
            } as React.CSSProperties}
          >
            <div 
              className="text-4xl mb-3"
              style={{
                textShadow: glowShadow('0 0 20px rgba(16,185,129,0.8), 0 0 40px rgba(16,185,129,0.6), 0 0 60px rgba(16,185,129,0.4)', glowIntensity),
                filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity * 0.3}px rgba(16,185,129,${glowIntensity / 100 * 0.6}))` : 'none'
              } as React.CSSProperties}
            >
              🧠
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Mindset & Foundations</h3>
            <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
              Build your mental foundation for success
            </p>
            <div className="text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Start →
            </div>
          </button>

          {/* Get Your Dream Job */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('[CourseSelector] DreamJob button clicked, calling onSelectDreamJob')
              onSelectDreamJob()
            }}
            className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-cyan-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
            style={{
              backdropFilter: 'blur(10px)',
              boxShadow: glowShadow('0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.2)', glowIntensity)
            } as React.CSSProperties}
          >
            <div 
              className="text-4xl mb-3"
              style={{
                textShadow: glowShadow('0 0 20px rgba(6,182,212,0.8), 0 0 40px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.4)', glowIntensity),
                filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity * 0.3}px rgba(6,182,212,${glowIntensity / 100 * 0.6}))` : 'none'
              } as React.CSSProperties}
            >
              💼
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Get Your Dream Job</h3>
            <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
              Land the career you've always wanted
            </p>
            <div className="text-cyan-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Start →
            </div>
          </button>

          {/* Build Your Side Income */}
          <Link
            href="/affiliate"
            className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-yellow-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
            style={{
              backdropFilter: 'blur(10px)',
              boxShadow: glowShadow('0 0 30px rgba(234,179,8,0.3), 0 0 60px rgba(234,179,8,0.2)', glowIntensity)
            }}
          >
            <div 
              className="text-4xl mb-3"
              style={{
                textShadow: glowShadow('0 0 20px rgba(234,179,8,0.8), 0 0 40px rgba(234,179,8,0.6), 0 0 60px rgba(234,179,8,0.4)', glowIntensity),
                filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity * 0.3}px rgba(234,179,8,${glowIntensity / 100 * 0.6}))` : 'none'
              } as React.CSSProperties}
            >
              💰
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Build Your Side Income</h3>
            <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
              grab our done-for-you products & begin printing ASAP!
            </p>
            <div className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Start →
            </div>
          </Link>
        </div>
      </div>

      {/* SkillBank Section */}
      <div>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">SkillBank</h2>
            <p className="text-[rgba(255,255,255,0.6)] text-lg">
              Learn the micro-skills you need to continue balling hard IRL
            </p>
          </div>
          {isAdmin && onAddCourse && (
            <button
              onClick={onAddCourse}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Course
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skillbankCourses.map((course) => {
            const courseColor = course.color || '#06B6D4'
            const rgbValues = hexToRgb(courseColor)
            // Note: We'll need to check is_published from the actual course data
            const isPublished = (course as any).is_published !== false
            const borderColor = isPublished ? courseColor : '#FCD34D'
            
            return (
              <div
                key={course.id}
                onClick={(e) => {
                  // Don't select course if clicking on menu area
                  if ((e.target as HTMLElement).closest('[data-menu-container]')) {
                    return
                  }
                  console.log('[CourseSelector] Click:', { 
                    title: course.title, 
                    isPublished, 
                    isAdmin, 
                    canClick: (isPublished || isAdmin) && onSelectCourse 
                  })
                  if ((isPublished || isAdmin) && onSelectCourse) {
                    onSelectCourse(course)
                  }
                }}
                className={`bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 rounded-2xl p-6 transition-all hover:shadow-lg group relative ${(isPublished || isAdmin) && onSelectCourse ? 'cursor-pointer' : 'cursor-not-allowed'} flex flex-col`}
                style={{
                  backdropFilter: 'blur(10px)',
                  borderColor: borderColor,
                  opacity: !isPublished && !isAdmin ? 0.6 : 1,
                  pointerEvents: ((!isPublished && !isAdmin) || !onSelectCourse) ? 'none' : 'auto',
                  boxShadow: isPublished 
                    ? glowShadow(`0 0 30px rgba(${rgbValues},0.3), 0 0 60px rgba(${rgbValues},0.2)`, glowIntensity)
                    : glowShadow('0 0 20px rgba(252,211,77,0.3), 0 0 40px rgba(252,211,77,0.2)', glowIntensity),
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '240px'
                }}
              >
                {/* Top section with emoji and menu */}
                <div className="flex items-start justify-between mb-4 relative">
                  <div 
                    className="text-4xl"
                    style={{
                      textShadow: glowShadow(`0 0 20px rgba(${rgbValues},0.8), 0 0 40px rgba(${rgbValues},0.6), 0 0 60px rgba(${rgbValues},0.4)`, glowIntensity),
                      filter: glowIntensity > 0 ? `drop-shadow(0 0 ${glowIntensity * 0.3}px rgba(${rgbValues},${glowIntensity / 100 * 0.6}))` : 'none'
                    } as React.CSSProperties}
                  >
                    {course.emoji || '📚'}
                  </div>
                  
                  {/* Top right corner - menu and badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isPublished && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold border border-yellow-500/30 whitespace-nowrap">
                        Draft
                      </span>
                    )}
                    {isPublished && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold border border-green-500/30 whitespace-nowrap">
                        Live
                      </span>
                    )}
                    
                    {/* DEBUG: Always show admin status */}
                    <div className="text-xs text-red-500" style={{ position: 'absolute', top: 0, right: 0, zIndex: 9999 }}>
                      Admin: {String(isAdmin)}
                    </div>
                    
                    {isAdmin ? (
                      <div 
                        className="relative" 
                        ref={(el) => { menuRefs.current[course.id] = el }}
                        data-menu-container
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            alert('MENU BUTTON CLICKED! isAdmin: ' + isAdmin)
                            e.stopPropagation()
                            e.preventDefault()
                            console.log('[CourseSelector] 🔵 Menu button clicked for:', course.id, 'isAdmin:', isAdmin)
                            const newMenuId = openMenuId === course.id ? null : course.id
                            console.log('[CourseSelector] Setting menu to:', newMenuId)
                            setOpenMenuId(newMenuId)
                          }}
                          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.15)] transition-colors text-white opacity-80 hover:opacity-100"
                          title="Course options"
                          style={{ zIndex: 10, pointerEvents: 'auto' }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {openMenuId === course.id && (
                          <div 
                            className="absolute top-9 right-0 z-[100] bg-[rgba(26,26,46,0.98)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.2)] rounded-lg shadow-2xl min-w-[160px] overflow-hidden"
                            data-menu-container
                            style={{ pointerEvents: 'auto' }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                alert('DELETE BUTTON CLICKED! Course: ' + course.title)
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('[CourseSelector] 🔴🔴🔴 DELETE BUTTON CLICKED:', course.id, course.title)
                                
                                setOpenMenuId(null)
                                
                                // Direct inline delete - no async wrapper
                                handleDeleteCourse(course.id, course.title, e).catch(err => {
                                  console.error('[CourseSelector] Delete error:', err)
                                  alert('Delete failed: ' + err.message)
                                })
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-[rgba(239,68,68,0.15)] transition-colors flex items-center gap-2 cursor-pointer"
                              style={{ pointerEvents: 'auto', zIndex: 1000 }}
                            >
                              <Trash2 size={14} />
                              Delete Course
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-6 h-6" onClick={() => alert('NOT ADMIN - isAdmin: ' + isAdmin)} />
                    )}
                  </div>
                </div>
                
                {/* Content section - flex-grow to push footer down */}
                <div className="flex-grow flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                  
                  {course.description && (
                    <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  
                  {(course as any).stats && (
                    <div className="flex items-center gap-3 text-xs text-[rgba(255,255,255,0.5)] mb-4">
                      <span>{(course as any).stats.lessons} lessons</span>
                      {(course as any).stats.progress > 0 && (
                        <span className="text-cyan-400 font-semibold">{(course as any).stats.progress}% complete</span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-auto pt-2">
                    {isPublished && (
                      <div className="text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1" style={{ color: courseColor }}>
                        Start →
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {skillbankCourses.length === 0 && !isAdmin && (
            <div className="col-span-full text-center py-12">
              <p className="text-[rgba(255,255,255,0.5)]">No courses available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

