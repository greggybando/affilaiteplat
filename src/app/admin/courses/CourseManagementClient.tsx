'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Edit2, GripVertical, X, Check, Youtube, Video, Paperclip } from 'lucide-react'
import { AttachmentManager } from './components/AttachmentManager'

interface Video {
  id?: string
  video_id: string
  title: string
  youtube_id?: string
  loom_id?: string
  display_order: number
}

interface Section {
  id?: string
  section_id: number
  number: number
  title: string
  description?: string
  display_order: number
  videos: Video[]
}

interface Category {
  id?: string
  category_id: string
  title: string
  is_start_here: boolean
  display_order: number
  sections: Section[]
}

interface CourseManagementClientProps {
  affiliate: {
    id: string
    role: string
  }
}

export function CourseManagementClient({ affiliate }: CourseManagementClientProps) {
  const [courseType, setCourseType] = useState<'mindset' | 'dreamjob' | 'affiliate'>('mindset')
  const [structure, setStructure] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<{ type: 'category' | 'section' | 'video', categoryIndex?: number, sectionIndex?: number, videoIndex?: number } | null>(null)
  const [editing, setEditing] = useState<{ type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number } | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [attachmentManager, setAttachmentManager] = useState<{ parentId: string, parentType: 'video_id' | 'section_id' | 'category_id' } | null>(null)

  // Extract YouTube ID from URL
  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
    return url
  }

  // Extract Loom ID from URL
  const extractLoomId = (url: string): string => {
    if (!url) return ''
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : ''
  }

  useEffect(() => {
    loadStructure()
  }, [courseType])

  const loadStructure = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses?courseType=${courseType}`)
      const data = await res.json()
      if (data.structure) {
        setStructure(data.structure)
      } else {
        // If no structure in DB, load from hardcoded (for initial setup)
        setStructure([])
      }
    } catch (error) {
      console.error('Error loading structure:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveStructure = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType, structure })
      })
      const data = await res.json()
      if (data.success) {
        alert('Course structure saved successfully!')
      } else {
        alert('Error saving: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving course structure')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number) => {
    setDraggedItem({ type, categoryIndex, sectionIndex, videoIndex })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetType: 'category' | 'section' | 'video', targetCategoryIndex: number, targetSectionIndex?: number, targetVideoIndex?: number) => {
    if (!draggedItem) return

    const newStructure = [...structure]

    if (draggedItem.type === 'category' && targetType === 'category') {
      // Reorder categories
      const [moved] = newStructure.splice(draggedItem.categoryIndex!, 1)
      newStructure.splice(targetCategoryIndex, 0, moved)
      newStructure.forEach((cat, idx) => { cat.display_order = idx })
    } else if (draggedItem.type === 'section' && targetType === 'section' && draggedItem.categoryIndex === targetCategoryIndex) {
      // Reorder sections within same category
      const category = newStructure[targetCategoryIndex]
      const [moved] = category.sections.splice(draggedItem.sectionIndex!, 1)
      category.sections.splice(targetSectionIndex!, 0, moved)
      category.sections.forEach((sec, idx) => { sec.display_order = idx })
    } else if (draggedItem.type === 'video' && targetType === 'video' && draggedItem.categoryIndex === targetCategoryIndex && draggedItem.sectionIndex === targetSectionIndex) {
      // Reorder videos within same section
      const section = newStructure[targetCategoryIndex].sections[targetSectionIndex!]
      const [moved] = section.videos.splice(draggedItem.videoIndex!, 1)
      section.videos.splice(targetVideoIndex!, 0, moved)
      section.videos.forEach((vid, idx) => { vid.display_order = idx })
    }

    setStructure(newStructure)
    setDraggedItem(null)
  }

  const startEdit = (type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number) => {
    let item: any
    if (type === 'category') {
      item = structure[categoryIndex]
      setEditValues({ title: item.title, is_start_here: item.is_start_here })
    } else if (type === 'section') {
      item = structure[categoryIndex].sections[sectionIndex!]
      setEditValues({ title: item.title, description: item.description })
    } else {
      item = structure[categoryIndex].sections[sectionIndex!].videos[videoIndex!]
      setEditValues({ title: item.title, youtube_id: item.youtube_id || '', loom_id: item.loom_id || '' })
    }
    setEditing({ type, categoryIndex, sectionIndex, videoIndex })
  }

  const saveEdit = () => {
    if (!editing) return

    const newStructure = [...structure]
    if (editing.type === 'category') {
      newStructure[editing.categoryIndex].title = editValues.title
      newStructure[editing.categoryIndex].is_start_here = editValues.is_start_here || false
    } else if (editing.type === 'section') {
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].title = editValues.title
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].description = editValues.description
    } else {
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].title = editValues.title
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].youtube_id = editValues.youtube_id || undefined
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].loom_id = editValues.loom_id || undefined
    }

    setStructure(newStructure)
    setEditing(null)
    setEditValues({})
  }

  const addCategory = () => {
    const newCategory: Category = {
      category_id: `category-${Date.now()}`,
      title: 'New Category',
      is_start_here: false,
      display_order: structure.length,
      sections: []
    }
    setStructure([...structure, newCategory])
  }

  const addSection = (categoryIndex: number) => {
    const newStructure = [...structure]
    const category = newStructure[categoryIndex]
    const newSection: Section = {
      section_id: Date.now(),
      number: category.sections.length + 1,
      title: 'New Section',
      display_order: category.sections.length,
      videos: []
    }
    category.sections.push(newSection)
    setStructure(newStructure)
  }

  const addVideo = (categoryIndex: number, sectionIndex: number) => {
    const newStructure = [...structure]
    const section = newStructure[categoryIndex].sections[sectionIndex]
    const newVideo: Video = {
      video_id: `v-${Date.now()}`,
      title: 'New Video',
      display_order: section.videos.length
    }
    section.videos.push(newVideo)
    setStructure(newStructure)
  }

  const deleteItem = (type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const newStructure = [...structure]
    if (type === 'category') {
      newStructure.splice(categoryIndex, 1)
      newStructure.forEach((cat, idx) => { cat.display_order = idx })
    } else if (type === 'section') {
      newStructure[categoryIndex].sections.splice(sectionIndex!, 1)
      newStructure[categoryIndex].sections.forEach((sec, idx) => { sec.display_order = idx })
    } else {
      newStructure[categoryIndex].sections[sectionIndex!].videos.splice(videoIndex!, 1)
      newStructure[categoryIndex].sections[sectionIndex!].videos.forEach((vid, idx) => { vid.display_order = idx })
    }
    setStructure(newStructure)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="text-white text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Course Management</h1>
            <p className="text-slate-400">Manage course structure, videos, and content</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={courseType}
              onChange={(e) => setCourseType(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700"
            >
              <option value="mindset">Mindset / LD World</option>
              <option value="dreamjob">Dream Job</option>
              <option value="affiliate">Affiliate</option>
            </select>
            <button
              onClick={saveStructure}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {structure.map((category, catIndex) => (
            <div
              key={category.id || category.category_id}
              draggable
              onDragStart={() => handleDragStart('category', catIndex)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('category', catIndex)}
              className="bg-slate-800 rounded-lg border border-slate-700 p-4 cursor-move"
            >
              <div className="flex items-center gap-3 mb-3">
                <GripVertical className="w-5 h-5 text-slate-500" />
                {editing?.type === 'category' && editing.categoryIndex === catIndex ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValues.title}
                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                      className="flex-1 px-3 py-1 bg-slate-700 text-white rounded border border-slate-600"
                      placeholder="Category title"
                    />
                    <label className="flex items-center gap-2 text-slate-300 text-sm">
                      <input
                        type="checkbox"
                        checked={editValues.is_start_here}
                        onChange={(e) => setEditValues({ ...editValues, is_start_here: e.target.checked })}
                        className="rounded"
                      />
                      Start Here
                    </label>
                    <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1 text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-white flex-1">
                      {category.title}
                      {category.is_start_here && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">START HERE</span>}
                    </h2>
                    <button onClick={() => startEdit('category', catIndex)} className="p-2 text-slate-400 hover:text-white">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {category.id && (
                      <button 
                        onClick={() => setAttachmentManager({ parentId: category.id!, parentType: 'category_id' })} 
                        className="p-2 text-slate-400 hover:text-blue-400"
                        title="Manage attachments"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => addSection(catIndex)} className="p-2 text-slate-400 hover:text-emerald-400">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteItem('category', catIndex)} className="p-2 text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="ml-8 space-y-2">
                {category.sections.map((section, secIndex) => (
                  <div
                    key={section.id || section.section_id}
                    draggable
                    onDragStart={() => handleDragStart('section', catIndex, secIndex)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop('section', catIndex, secIndex)}
                    className="bg-slate-700/50 rounded border border-slate-600 p-3 cursor-move"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-slate-500" />
                      {editing?.type === 'section' && editing.categoryIndex === catIndex && editing.sectionIndex === secIndex ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValues.title}
                            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                            className="flex-1 px-3 py-1 bg-slate-600 text-white rounded border border-slate-500"
                            placeholder="Section title"
                          />
                          <input
                            type="text"
                            value={editValues.description || ''}
                            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                            className="flex-1 px-3 py-1 bg-slate-600 text-white rounded border border-slate-500"
                            placeholder="Description"
                          />
                          <button onClick={saveEdit} className="p-1 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-medium text-slate-200 flex-1">{section.title}</h3>
                          <button onClick={() => startEdit('section', catIndex, secIndex)} className="p-1 text-slate-400 hover:text-white">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {section.id && (
                            <button 
                              onClick={() => setAttachmentManager({ parentId: section.id!, parentType: 'section_id' })} 
                              className="p-1 text-slate-400 hover:text-blue-400"
                              title="Manage attachments"
                            >
                              <Paperclip className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => addVideo(catIndex, secIndex)} className="p-1 text-slate-400 hover:text-emerald-400">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteItem('section', catIndex, secIndex)} className="p-1 text-slate-400 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="ml-6 space-y-1">
                      {section.videos.map((video, vidIndex) => (
                        <div
                          key={video.video_id}
                          draggable
                          onDragStart={() => handleDragStart('video', catIndex, secIndex, vidIndex)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop('video', catIndex, secIndex, vidIndex)}
                          className="bg-slate-600/50 rounded border border-slate-500 p-2 cursor-move flex items-center gap-2"
                        >
                          <GripVertical className="w-3 h-3 text-slate-500" />
                          {editing?.type === 'video' && editing.categoryIndex === catIndex && editing.sectionIndex === secIndex && editing.videoIndex === vidIndex ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editValues.title}
                                onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
                                placeholder="Video title"
                              />
                              <input
                                type="text"
                                value={editValues.youtube_id || ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const id = extractYouTubeId(value)
                                  setEditValues({ ...editValues, youtube_id: id || value })
                                }}
                                className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
                                placeholder="YouTube URL or ID"
                              />
                              <input
                                type="text"
                                value={editValues.loom_id || ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const id = extractLoomId(value)
                                  setEditValues({ ...editValues, loom_id: id || value })
                                }}
                                className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
                                placeholder="Loom URL or ID"
                              />
                              <button onClick={saveEdit} className="p-1 text-emerald-400">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => setEditing(null)} className="p-1 text-red-400">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-sm text-slate-300">{video.title}</span>
                                {video.youtube_id && <Youtube className="w-3 h-3 text-red-500" />}
                                {video.loom_id && <Video className="w-3 h-3 text-purple-500" />}
                              </div>
                              <button onClick={() => startEdit('video', catIndex, secIndex, vidIndex)} className="p-1 text-slate-400 hover:text-white">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {video.id && (
                                <button 
                                  onClick={() => setAttachmentManager({ parentId: video.id!, parentType: 'video_id' })} 
                                  className="p-1 text-slate-400 hover:text-blue-400"
                                  title="Manage attachments"
                                >
                                  <Paperclip className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => deleteItem('video', catIndex, secIndex, vidIndex)} className="p-1 text-slate-400 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={addCategory}
            className="w-full py-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>
      </div>

      {/* Attachment Manager Modal */}
      {attachmentManager && (
        <AttachmentManager
          parentId={attachmentManager.parentId}
          parentType={attachmentManager.parentType}
          courseType={courseType}
          onClose={() => setAttachmentManager(null)}
        />
      )}
    </div>
  )
}

