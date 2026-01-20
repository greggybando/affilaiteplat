'use client'

import Link from 'next/link'
import { Course } from '@/lib/types/courses'
import { Plus } from 'lucide-react'

interface CourseSelectorProps {
  courses: Course[]
  glowIntensity: number
  isAdmin: boolean
  onSelectCourse?: (course: Course) => void
  onSelectMindset: () => void
  onSelectDreamJob: () => void
  onAddCourse?: () => void
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
  return shadows
}

export function CourseSelector({
  courses,
  glowIntensity,
  isAdmin,
  onSelectCourse,
  onSelectMindset,
  onSelectDreamJob,
  onAddCourse
}: CourseSelectorProps) {
  // Filter out foundation courses (mindset, dream-job, side-income)
  const skillbankCourses = courses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug))

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
            <div className="text-4xl mb-3">🧠</div>
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
            <div className="text-4xl mb-3">💼</div>
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
            <div className="text-4xl mb-3">💰</div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skillbankCourses.map((course) => {
            const courseColor = course.color || '#06B6D4'
            const rgbValues = hexToRgb(courseColor)
            // Note: We'll need to check is_published from the actual course data
            const isPublished = (course as any).is_published !== false
            const borderColor = isPublished ? courseColor : '#FCD34D'
            
            return (
              <div
                key={course.id}
                onClick={() => {
                  if (isPublished && onSelectCourse) {
                    onSelectCourse(course)
                  }
                }}
                className={`bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 rounded-2xl p-6 transition-all hover:shadow-lg group ${isPublished && onSelectCourse ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                style={{
                  backdropFilter: 'blur(10px)',
                  borderColor: borderColor,
                  opacity: !isPublished && !isAdmin ? 0.6 : 1,
                  boxShadow: isPublished 
                    ? glowShadow(`0 0 30px rgba(${rgbValues},0.3), 0 0 60px rgba(${rgbValues},0.2)`, glowIntensity)
                    : glowShadow('0 0 20px rgba(252,211,77,0.3), 0 0 40px rgba(252,211,77,0.2)', glowIntensity)
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{course.emoji || '📚'}</div>
                  {!isPublished && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold border border-yellow-500/30">
                      Draft
                    </span>
                  )}
                  {isPublished && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold border border-green-500/30">
                      Live
                    </span>
                  )}
                </div>
                
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
                
                {isPublished && (
                  <div className="text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-2" style={{ color: courseColor }}>
                    Start →
                  </div>
                )}
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

