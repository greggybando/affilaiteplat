'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Edit2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'

interface Checkpoint {
  id: string
  section_id: string
  video_id?: string | null
  title: string
  description?: string
  requirements: string
  ai_review_enabled: boolean
  ai_review_prompt?: string
  requires_manual_review: boolean
}

interface Video {
  id: string
  videoId: number
  title: string
  displayOrder: number
  checkpoint: Checkpoint | null
}

interface Section {
  id: string
  title: string
  displayOrder: number
  checkpoint: Checkpoint | null
  videos: Video[]
}

interface Course {
  courseType: string
  title: string
  sections: Section[]
}

interface CheckpointsManagementClientProps {
  affiliate: {
    id: string
    role: string
  }
}

export function CheckpointsManagementClient({ affiliate }: CheckpointsManagementClientProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ 
    sectionId: string
    videoId?: string | null
    checkpoint: Checkpoint | null
    videos: Video[]
  } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    aiReviewEnabled: true,
    aiReviewPrompt: '',
    requiresManualReview: false,
    videoId: '' as string | null  // empty string = section-level, UUID = video-level
  })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCheckpoints()
  }, [])

  const loadCheckpoints = async () => {
    setLoading(true)
    console.log('[Checkpoints Client] Loading checkpoints...')
    try {
      const res = await fetch('/api/admin/checkpoints')
      console.log('[Checkpoints Client] Response status:', res.status)
      const data = await res.json()
      console.log('[Checkpoints Client] Response data:', data)
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load checkpoints')
      }
      
      if (data.courses) {
        setCourses(data.courses)
        console.log('[Checkpoints Client] Loaded', data.courses.length, 'courses')
      } else {
        console.log('[Checkpoints Client] No courses in response')
      }
    } catch (error: any) {
      console.error('[Checkpoints Client] Error loading checkpoints:', error)
      alert(`Failed to load checkpoints: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateGreatUnlearning = async () => {
    if (!confirm('Update "The Great Unlearning" checkpoint requirements to be simpler?')) {
      return
    }
    
    try {
      const res = await fetch('/api/admin/checkpoints/update-great-unlearning', {
        method: 'POST'
      })
      const data = await res.json()
      
      if (res.ok) {
        alert('✅ Checkpoint updated successfully!')
        loadCheckpoints() // Reload to show updated requirements
      } else {
        alert(`Error: ${data.error || 'Failed to update checkpoint'}`)
      }
    } catch (error) {
      console.error('Error updating checkpoint:', error)
      alert('Failed to update checkpoint')
    }
  }

  const startEdit = (section: Section, videoId?: string, checkpoint?: Checkpoint | null) => {
    const cp = checkpoint ?? section.checkpoint
    if (cp) {
      setEditing({ 
        sectionId: section.id, 
        videoId: videoId || cp.video_id || null,
        checkpoint: cp,
        videos: section.videos || []
      })
      setFormData({
        title: cp.title,
        description: cp.description || '',
        requirements: cp.requirements,
        aiReviewEnabled: cp.ai_review_enabled,
        aiReviewPrompt: cp.ai_review_prompt || '',
        requiresManualReview: cp.requires_manual_review,
        videoId: cp.video_id || ''
      })
    } else {
      setEditing({ 
        sectionId: section.id, 
        videoId: videoId || null,
        checkpoint: null,
        videos: section.videos || []
      })
      setFormData({
        title: '',
        description: '',
        requirements: '',
        aiReviewEnabled: true,
        aiReviewPrompt: '',
        requiresManualReview: false,
        videoId: videoId || ''
      })
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(Array.from(expandedSections))
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const cancelEdit = () => {
    setEditing(null)
    setFormData({
      title: '',
      description: '',
      requirements: '',
      aiReviewEnabled: true,
      aiReviewPrompt: '',
      requiresManualReview: false,
      videoId: ''
    })
  }

  const saveCheckpoint = async () => {
    if (!editing) return

    if (!formData.title || !formData.requirements) {
      alert('Title and requirements are required')
      return
    }

    // Prepare data - convert empty string to null for videoId
    const saveData = {
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      aiReviewEnabled: formData.aiReviewEnabled,
      aiReviewPrompt: formData.aiReviewPrompt,
      requiresManualReview: formData.requiresManualReview,
      videoId: formData.videoId || null
    }

    try {
      if (editing.checkpoint) {
        // Update existing
        const res = await fetch('/api/admin/checkpoints', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.checkpoint.id,
            ...saveData
          })
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to update checkpoint')
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/checkpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: editing.sectionId,
            ...saveData
          })
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to create checkpoint')
        }
      }

      await loadCheckpoints()
      cancelEdit()
      alert('Checkpoint saved successfully!')
    } catch (error: any) {
      console.error('Error saving checkpoint:', error)
      alert(error.message || 'Failed to save checkpoint')
    }
  }

  const deleteCheckpoint = async (checkpointId: string) => {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return

    try {
      const res = await fetch(`/api/admin/checkpoints?id=${checkpointId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete checkpoint')
      }

      await loadCheckpoints()
      alert('Checkpoint deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting checkpoint:', error)
      alert(error.message || 'Failed to delete checkpoint')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Checkpoint Management</h1>
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  // Find "THE GREAT UNLEARNING" section to show quick update button
  let greatUnlearningSection: Section | null = null
  for (const course of courses) {
    if (course.courseType === 'dreamjob') {
      greatUnlearningSection = course.sections.find((s: Section) => 
        s.title === 'THE GREAT UNLEARNING' || s.title.includes('GREAT UNLEARNING')
      ) || null
      if (greatUnlearningSection) break
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkpoint Management</h1>
        <p className="text-slate-400 mb-8">
          Manage checkpoints for sections and individual videos. 
          <span className="text-cyan-400"> Section-level</span> checkpoints gate the next section. 
          <span className="text-purple-400"> Video-level</span> checkpoints gate the next video within a section.
        </p>

        {courses.length === 0 ? (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center">
            <p className="text-slate-400 mb-4">No courses found in database.</p>
            <p className="text-slate-500 text-sm">Make sure course_categories and course_sections tables have data.</p>
            <button
              onClick={loadCheckpoints}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : null}

        {courses.map((course) => (
          <div key={course.courseType} className="mb-12">
            <h2 className="text-2xl font-semibold mb-4" style={{
              color: 'rgba(34,211,238,0.9)',
              textShadow: '0 0 8px rgba(34,211,238,0.4)'
            }}>
              {course.title} ({course.courseType})
            </h2>

            <div className="space-y-4">
              {course.sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6"
                >
                  {/* Section Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                        {section.videos && section.videos.length > 0 && (
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            {expandedSections.has(section.id) ? '▼' : '▶'} {section.videos.length} videos
                          </button>
                        )}
                      </div>
                      {section.checkpoint ? (
                        <div className="text-sm text-cyan-400 mt-1">
                          📋 Section Checkpoint: {section.checkpoint.title}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mt-1">No section checkpoint</div>
                      )}
                      {section.videos && section.videos.filter((v: Video) => v.checkpoint).length > 0 && (
                        <div className="text-sm text-purple-400 mt-1">
                          🎬 {section.videos.filter((v: Video) => v.checkpoint).length} video checkpoint(s)
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(section, undefined, section.checkpoint)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        {section.checkpoint ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {section.checkpoint ? 'Edit Section' : '+ Section'}
                      </button>
                      {section.videos && section.videos.length > 0 && (
                        <button
                          onClick={() => {
                            const newSet = new Set(Array.from(expandedSections))
                            newSet.add(section.id)
                            setExpandedSections(newSet)
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          + Video
                        </button>
                      )}
                      {section.checkpoint && (
                        <button
                          onClick={() => deleteCheckpoint(section.checkpoint!.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video List (Collapsible) */}
                  {expandedSections.has(section.id) && section.videos && section.videos.length > 0 && (
                    <div className="mt-4 space-y-2 border-l-2 border-slate-700 pl-4">
                      {section.videos.map((video: Video) => (
                        <div 
                          key={video.id} 
                          className="flex items-center justify-between py-2 px-3 bg-slate-900/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="text-sm text-slate-300">
                              🎬 {video.title}
                            </div>
                            {video.checkpoint ? (
                              <div className="text-xs text-purple-400">
                                ✓ Checkpoint: {video.checkpoint.title}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(section, video.id, video.checkpoint)}
                              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors flex items-center gap-1"
                            >
                              {video.checkpoint ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {video.checkpoint ? 'Edit' : 'Add'}
                            </button>
                            {video.checkpoint && (
                              <button
                                onClick={() => deleteCheckpoint(video.checkpoint!.id)}
                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {editing?.sectionId === section.id && (
                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div className="space-y-4">
                        {/* Checkpoint Type Indicator */}
                        <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                          formData.videoId 
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' 
                            : 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50'
                        }`}>
                          {formData.videoId ? (
                            <>🎬 Video-Level Checkpoint - Gates next video in section</>
                          ) : (
                            <>📋 Section-Level Checkpoint - Gates next section</>
                          )}
                        </div>

                        {/* Video Selector (only show if section has videos) */}
                        {editing.videos && editing.videos.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Checkpoint Level
                            </label>
                            <select
                              value={formData.videoId || ''}
                              onChange={(e) => setFormData({ ...formData, videoId: e.target.value || null })}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                              <option value="">📋 Section Level (gates next section)</option>
                              <optgroup label="🎬 Video Level (gates next video)">
                                {editing.videos.map((video: Video) => (
                                  <option key={video.id} value={video.id}>
                                    After: {video.title}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="e.g., Complete Trial Project"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Description
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            rows={2}
                            placeholder="Optional description"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Requirements * (What user must submit/complete)
                          </label>
                          <textarea
                            value={formData.requirements}
                            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            rows={4}
                            placeholder="Describe what the user must submit or complete..."
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.aiReviewEnabled}
                              onChange={(e) => setFormData({ ...formData, aiReviewEnabled: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-300">AI Review Enabled</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.requiresManualReview}
                              onChange={(e) => setFormData({ ...formData, requiresManualReview: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-300">Requires Manual Review</span>
                          </label>
                        </div>

                        {formData.aiReviewEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Custom AI Prompt (Optional)
                            </label>
                            <textarea
                              value={formData.aiReviewPrompt}
                              onChange={(e) => setFormData({ ...formData, aiReviewPrompt: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              rows={3}
                              placeholder="Custom prompt for AI review (uses default if empty)"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={saveCheckpoint}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.checkpoint && editing?.sectionId !== section.id && (
                    <div className="mt-4 p-4 bg-slate-900/30 rounded-lg">
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-slate-400">Requirements:</span>
                          <p className="text-slate-300 mt-1">{section.checkpoint.requirements}</p>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className={section.checkpoint.ai_review_enabled ? 'text-green-400' : 'text-slate-500'}>
                            AI Review: {section.checkpoint.ai_review_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <span className={section.checkpoint.requires_manual_review ? 'text-yellow-400' : 'text-slate-500'}>
                            Manual Review: {section.checkpoint.requires_manual_review ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

