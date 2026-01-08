'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Save } from 'lucide-react'

interface UnlockRule {
  id: string
  target_type: 'course' | 'section'
  target_id: string
  required_checkpoint_id: string
  required_checkpoint?: {
    id: string
    title: string
    section?: {
      id: string
      title: string
      category?: {
        course_type: string
        title: string
      }
    }
  }
}

interface Checkpoint {
  id: string
  title: string
  section: {
    id: string
    title: string
    category: {
      course_type: string
      title: string
    }
  }
}

interface UnlockRulesManagementClientProps {
  affiliate: {
    id: string
    role: string
  }
}

export function UnlockRulesManagementClient({ affiliate }: UnlockRulesManagementClientProps) {
  const [rules, setRules] = useState<UnlockRule[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    targetType: 'section' as 'course' | 'section',
    targetId: '',
    requiredCheckpointId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesRes, checkpointsRes] = await Promise.all([
        fetch('/api/admin/unlock-rules'),
        fetch('/api/admin/checkpoints')
      ])

      const rulesData = await rulesRes.json()
      const checkpointsData = await checkpointsRes.json()

      setRules(rulesData.rules || [])
      
      // Flatten checkpoints from all courses
      const allCheckpoints: Checkpoint[] = []
      if (checkpointsData.courses) {
        checkpointsData.courses.forEach((course: any) => {
          course.sections.forEach((section: any) => {
            if (section.checkpoint) {
              allCheckpoints.push({
                id: section.checkpoint.id,
                title: section.checkpoint.title,
                section: {
                  id: section.id,
                  title: section.title,
                  category: {
                    course_type: course.courseType,
                    title: course.title
                  }
                }
              })
            }
          })
        })
      }
      setCheckpoints(allCheckpoints)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load unlock rules')
    } finally {
      setLoading(false)
    }
  }

  const createRule = async () => {
    if (!formData.targetId || !formData.requiredCheckpointId) {
      alert('Please fill in all fields')
      return
    }

    try {
      const res = await fetch('/api/admin/unlock-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create rule')
      }

      await loadData()
      setCreating(false)
      setFormData({
        targetType: 'section',
        targetId: '',
        requiredCheckpointId: ''
      })
      alert('Unlock rule created successfully!')
    } catch (error: any) {
      console.error('Error creating rule:', error)
      alert(error.message || 'Failed to create rule')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this unlock rule?')) return

    try {
      const res = await fetch(`/api/admin/unlock-rules?id=${ruleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete rule')
      }

      await loadData()
      alert('Unlock rule deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting rule:', error)
      alert(error.message || 'Failed to delete rule')
    }
  }

  const getTargetDisplay = (rule: UnlockRule) => {
    if (rule.target_type === 'course') {
      return `Course: ${rule.target_id}`
    } else {
      // For sections, we'd need to fetch section details
      return `Section: ${rule.target_id.substring(0, 8)}...`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Unlock Rules Management</h1>
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Unlock Rules Management</h1>
        <p className="text-slate-400 mb-8">
          Define which checkpoints unlock which courses or sections. If no rule exists, sections unlock sequentially.
        </p>

        <button
          onClick={() => setCreating(true)}
          className="mb-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Unlock Rule
        </button>

        {creating && (
          <div className="mb-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h2 className="text-xl font-semibold mb-4">Create New Unlock Rule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Target Type
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value as 'course' | 'section' })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="course">Course</option>
                  <option value="section">Section</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {formData.targetType === 'course' ? 'Course Type' : 'Section ID'}
                </label>
                {formData.targetType === 'course' ? (
                  <select
                    value={formData.targetId}
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select course...</option>
                    <option value="mindset">Mindset & Foundations</option>
                    <option value="dreamjob">Get Your Dream Job</option>
                    <option value="affiliate">Build Your Side Income</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.targetId}
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Enter section UUID"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Required Checkpoint
                </label>
                <select
                  value={formData.requiredCheckpointId}
                  onChange={(e) => setFormData({ ...formData, requiredCheckpointId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Select checkpoint...</option>
                  {checkpoints.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.title} ({cp.section.category.title} → {cp.section.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createRule}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Rule
                </button>
                <button
                  onClick={() => {
                    setCreating(false)
                    setFormData({
                      targetType: 'section',
                      targetId: '',
                      requiredCheckpointId: ''
                    })
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-slate-400 text-center py-12">
              No unlock rules. Sections will unlock sequentially by default.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white mb-2">
                      {rule.target_type === 'course' ? 'Course' : 'Section'} Unlock Rule
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Target:</span>{' '}
                        {rule.target_type === 'course' ? (
                          <span className="text-slate-300">{rule.target_id}</span>
                        ) : (
                          <span className="text-slate-300">{rule.target_id.substring(0, 8)}...</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">Requires:</span>{' '}
                        <span className="text-slate-300">
                          {rule.required_checkpoint?.title || 'Checkpoint ' + rule.required_checkpoint_id.substring(0, 8)}
                        </span>
                      </div>
                      {rule.required_checkpoint?.section?.category && (
                        <div className="text-xs text-slate-500 mt-2">
                          From: {rule.required_checkpoint.section.category.title} → {rule.required_checkpoint.section.title}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

