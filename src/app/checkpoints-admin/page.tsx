'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Edit2, X, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
  moduleId: number
  hasCheckpoint: boolean
  checkpoint: Checkpoint | null
  videos: Video[]
}

interface Course {
  courseType: string
  title: string
  sections: Section[]
}

export default function CheckpointsAdminPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ 
    sectionId: string
    videoId?: string | null
    checkpoint: Checkpoint | null
    videos: Video[]
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    aiReviewEnabled: true,
    aiReviewPrompt: '',
    requiresManualReview: false,
    videoId: '' as string | null
  })

  useEffect(() => {
    loadCheckpoints()
  }, [])

  const loadCheckpoints = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/admin/checkpoints')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      
      // Transform data to include moduleId
      const transformedCourses = (data.courses || []).map((course: any) => ({
        ...course,
        sections: (course.sections || []).map((section: any, index: number) => ({
          ...section,
          moduleId: section.displayOrder + 1,
          hasCheckpoint: !!section.checkpoint
        }))
      }))
      
      setCourses(transformedCourses)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
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
      const videoTitle = videoId 
        ? section.videos?.find(v => v.id === videoId)?.title 
        : section.title
      setEditing({ 
        sectionId: section.id, 
        videoId: videoId || null,
        checkpoint: null,
        videos: section.videos || []
      })
      setFormData({
        title: `Complete ${videoTitle || section.title}`,
        description: '',
        requirements: 'Submit a sentence explaining what you learned.',
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
    setSuccessMessage(null)
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

    setSaving(true)
    setSuccessMessage(null)

    // Prepare save data with videoId
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
        // Update existing checkpoint
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
          throw new Error(error.error || 'Failed to update')
        }
        
        setSuccessMessage('Checkpoint updated successfully!')
      } else {
        // Create new checkpoint
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
          throw new Error(error.error || 'Failed to create')
        }
        
        setSuccessMessage('Checkpoint created successfully!')
      }

      await loadCheckpoints()
      
      // Keep form open to show success, auto-close after 2 seconds
      setTimeout(() => {
        cancelEdit()
      }, 2000)
      
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteCheckpoint = async (checkpointId: string, sectionTitle: string) => {
    if (!confirm(`Delete checkpoint for "${sectionTitle}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/checkpoints?id=${checkpointId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }

      await loadCheckpoints()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Checkpoint Management</h1>
          </div>
          <button
            onClick={loadCheckpoints}
            disabled={loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-6xl mx-auto px-8 pt-6">
        <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-cyan-400 font-semibold mb-2">How Checkpoints Work</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• <span className="text-cyan-400">Section checkpoint</span> → unlocks next section</li>
            <li>• <span className="text-purple-400">Video checkpoint</span> → unlocks next video within section</li>
            <li>• Click <strong className="text-purple-400">+ Video</strong> to add a checkpoint after a specific video</li>
            <li>• The <strong>first module</strong> of any course is always unlocked</li>
          </ul>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8 pt-2">
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-4" />
            <div className="text-slate-400">Loading checkpoints...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 text-red-300">
              <AlertCircle className="w-5 h-5" />
              <p>Error: {error}</p>
            </div>
            <button
              onClick={loadCheckpoints}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">No courses found in database.</p>
            <p className="text-sm text-slate-500 mt-2">Make sure course_categories and course_sections tables have data.</p>
          </div>
        )}

        {courses.map((course) => (
          <div key={course.courseType} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-cyan-400">
                {course.title}
              </h2>
              <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                {course.courseType}
              </span>
              <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                {course.sections.length} modules
              </span>
            </div>

            <div className="space-y-3">
              {course.sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`bg-slate-800 rounded-lg border ${
                    section.hasCheckpoint 
                      ? 'border-green-500/30' 
                      : 'border-slate-700'
                  } p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        section.hasCheckpoint 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {section.moduleId}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{section.title}</h3>
                          {section.videos && section.videos.length > 0 && (
                            <button
                              onClick={() => toggleSection(section.id)}
                              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                            >
                              {expandedSections.has(section.id) ? '▼' : '▶'} {section.videos.length} videos
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">
                          {section.hasCheckpoint ? (
                            <span className="text-green-400">✓ Section checkpoint</span>
                          ) : index === 0 ? (
                            <span className="text-cyan-400">First module (always unlocked)</span>
                          ) : (
                            <span className="text-yellow-400">No checkpoint (auto-unlocked)</span>
                          )}
                          {section.videos && section.videos.filter((v: Video) => v.checkpoint).length > 0 && (
                            <span className="ml-2 text-purple-400">
                              + {section.videos.filter((v: Video) => v.checkpoint).length} video checkpoint(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(section, undefined, section.checkpoint)}
                        className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                          section.hasCheckpoint
                            ? 'bg-cyan-600 hover:bg-cyan-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {section.hasCheckpoint ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {section.hasCheckpoint ? 'Edit' : '+ Section'}
                      </button>
                      {section.videos && section.videos.length > 0 && (
                        <button
                          onClick={() => {
                            const newSet = new Set(Array.from(expandedSections))
                            newSet.add(section.id)
                            setExpandedSections(newSet)
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          + Video
                        </button>
                      )}
                      {section.hasCheckpoint && section.checkpoint && (
                        <button
                          onClick={() => deleteCheckpoint(section.checkpoint!.id, section.title)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video List (Collapsible) */}
                  {expandedSections.has(section.id) && section.videos && section.videos.length > 0 && (
                    <div className="mt-4 space-y-2 border-l-2 border-slate-700 pl-4 ml-10">
                      {section.videos.map((video: Video) => (
                        <div 
                          key={video.id} 
                          className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg"
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
                              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                video.checkpoint 
                                  ? 'bg-purple-600 hover:bg-purple-700' 
                                  : 'bg-purple-600/50 hover:bg-purple-600'
                              }`}
                            >
                              {video.checkpoint ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {video.checkpoint ? 'Edit' : 'Add'}
                            </button>
                            {video.checkpoint && (
                              <button
                                onClick={() => deleteCheckpoint(video.checkpoint!.id, video.title)}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Edit Form */}
                  {editing?.sectionId === section.id && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
                      {successMessage && (
                        <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg flex items-center gap-2 text-green-400">
                          <CheckCircle className="w-5 h-5" />
                          {successMessage}
                        </div>
                      )}
                      
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
                            <label className="block text-sm text-slate-300 mb-1">Checkpoint Level</label>
                            <select
                              value={formData.videoId || ''}
                              onChange={(e) => setFormData({ ...formData, videoId: e.target.value || null })}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
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
                          <label className="block text-sm text-slate-300 mb-1">Checkpoint Title *</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Complete The Great Unlearning"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-300 mb-1">Requirements * (what user must do)</label>
                          <textarea
                            value={formData.requirements}
                            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            placeholder="e.g., Submit a sentence explaining what you learned from this module."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500"
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-300 mb-1">Description (optional)</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Additional context for the user..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500"
                            rows={2}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.aiReviewEnabled}
                              onChange={(e) => setFormData({ ...formData, aiReviewEnabled: e.target.checked })}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">AI Auto-Review</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.requiresManualReview}
                              onChange={(e) => setFormData({ ...formData, requiresManualReview: e.target.checked })}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">Require Manual Review</span>
                          </label>
                        </div>

                        {formData.aiReviewEnabled && (
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Custom AI Prompt (optional)</label>
                            <textarea
                              value={formData.aiReviewPrompt}
                              onChange={(e) => setFormData({ ...formData, aiReviewPrompt: e.target.value })}
                              placeholder="Custom instructions for AI reviewer..."
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500"
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={saveCheckpoint}
                            disabled={saving}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded flex items-center gap-2"
                          >
                            {saving ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {saving ? 'Saving...' : 'Save Checkpoint'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show current requirements if not editing */}
                  {section.checkpoint && editing?.sectionId !== section.id && (
                    <div className="mt-3 p-3 bg-slate-900/50 rounded text-sm">
                      <div className="text-slate-400 mb-1">
                        <strong>Requirements:</strong>
                      </div>
                      <div className="text-slate-300">{section.checkpoint.requirements}</div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>AI Review: {section.checkpoint.ai_review_enabled ? '✓ Enabled' : '✗ Disabled'}</span>
                        <span>Manual Review: {section.checkpoint.requires_manual_review ? '✓ Required' : '✗ Not required'}</span>
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
