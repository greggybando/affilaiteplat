'use client'

import { useState } from 'react'
import { Upload, X, Loader2, Check } from 'lucide-react'

interface CourseImporterProps {
  courseId: string
  onImportComplete: () => void
  onClose: () => void
}

interface ParsedSection {
  title: string
  lessons: Array<{
    title: string
    videoUrl: string
  }>
}

export function CourseImporter({ courseId, onImportComplete, onClose }: CourseImporterProps) {
  const [content, setContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ParsedSection[]>([])
  const [error, setError] = useState<string | null>(null)

  // Parse Google Docs or structured text format
  const parseContent = (text: string): ParsedSection[] => {
    const sections: ParsedSection[] = []
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    let currentSection: ParsedSection | null = null
    let previousLine: string | null = null
    
    // Create default section if none exists
    const ensureSection = () => {
      if (!currentSection) {
        currentSection = {
          title: 'LESSONS',
          lessons: []
        }
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for section header (various formats)
      // Format 1: "SECTION: Title" or "Section: Title"
      // Format 2: "# Title" (markdown heading)
      // Format 3: "Title" (if it's all caps or has specific markers)
      const sectionMatch1 = line.match(/^(?:SECTION|Section):\s*(.+)$/i)
      const sectionMatch2 = line.match(/^#+\s*(.+)$/)
      const sectionMatch3 = line.match(/^[A-Z\s]+$/) && line.length > 3 && line.length < 50
      
      if (sectionMatch1 || sectionMatch2 || sectionMatch3) {
        // Save previous section if exists
        if (currentSection && currentSection.lessons.length > 0) {
          sections.push(currentSection)
        }
        
        let sectionTitle = ''
        if (sectionMatch1) {
          sectionTitle = sectionMatch1[1]
        } else if (sectionMatch2) {
          sectionTitle = sectionMatch2[1]
        } else if (sectionMatch3) {
          sectionTitle = line
        }
        
        currentSection = {
          title: sectionTitle.toUpperCase().trim(),
          lessons: []
        }
        previousLine = null
        continue
      }
      
      // Check if this line is a URL
      const urlMatch = line.match(/^(https?:\/\/.+)$/i)
      
      if (urlMatch) {
        ensureSection()
        
        // This is a URL - check if previous line was a title
        let lessonTitle = ''
        
        if (previousLine && !previousLine.match(/^(https?:\/\/.+)$/i) && !previousLine.match(/^(?:SECTION|Section):/i) && !previousLine.match(/^#+\s/)) {
          // Previous line is text and not a URL or section header - use it as title
          lessonTitle = previousLine.trim()
          // Remove trailing colon if present
          lessonTitle = lessonTitle.replace(/:\s*$/, '')
        } else {
          // No previous line text, extract from URL
          lessonTitle = extractVideoTitle(urlMatch[1])
        }
        
        currentSection!.lessons.push({
          title: lessonTitle,
          videoUrl: urlMatch[1].trim()
        })
        previousLine = null // Reset after using it
        continue
      }
      
      // Check for lesson with video URL on same line
      // Format 1: "- Lesson Title: https://..."
      // Format 2: "- https://..." (just URL, use previous line or extract)
      // Format 3: "Lesson Title: https://..."
      const lessonMatch1 = line.match(/^[-•]\s*(.+?):\s*(https?:\/\/.+)$/i)
      const lessonMatch2 = line.match(/^[-•]\s*(https?:\/\/.+)$/i)
      const lessonMatch3 = line.match(/^(.+?):\s*(https?:\/\/.+)$/i)
      
      if (lessonMatch1) {
        // Format 1: "- Lesson Title: https://..."
        ensureSection()
        currentSection!.lessons.push({
          title: lessonMatch1[1].trim(),
          videoUrl: lessonMatch1[2].trim()
        })
        previousLine = null
      } else if (lessonMatch2) {
        // Format 2: "- https://..." - check previous line
        ensureSection()
        let title = previousLine && !previousLine.match(/^(https?:\/\/.+)$/i) ? previousLine.replace(/:\s*$/, '').trim() : extractVideoTitle(lessonMatch2[1])
        currentSection!.lessons.push({
          title: title,
          videoUrl: lessonMatch2[1].trim()
        })
        previousLine = null
      } else if (lessonMatch3) {
        // Format 3: "Lesson Title: https://..."
        ensureSection()
        currentSection!.lessons.push({
          title: lessonMatch3[1].trim(),
          videoUrl: lessonMatch3[2].trim()
        })
        previousLine = null
      } else {
        // Not a URL or lesson format - save as potential title for next line
        previousLine = line
      }
    }
    
    // Add last section
    if (currentSection && currentSection.lessons.length > 0) {
      sections.push(currentSection)
    }
    
    return sections
  }

  const extractVideoTitle = (url: string): string => {
    // Try to extract title from YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
      if (match) {
        return `Video ${match[1].substring(0, 8)}`
      }
    }
    
    // Try to extract from Loom URL
    if (url.includes('loom.com')) {
      const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
      if (match) {
        return `Loom Video ${match[1].substring(0, 8)}`
      }
    }
    
    return 'Untitled Lesson'
  }

  const handlePreview = () => {
    try {
      setError(null)
      const parsed = parseContent(content)
      
      if (parsed.length === 0) {
        setError('No sections or lessons found. Make sure you have section headers and video URLs.')
        setPreview([])
        return
      }
      
      setPreview(parsed)
    } catch (err: any) {
      setError(err.message || 'Failed to parse content')
      setPreview([])
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('Please preview first to verify the structure')
      return
    }

    setImporting(true)
    setError(null)

    try {
      // Create sections and lessons
      for (const section of preview) {
        // Create section
        const sectionRes = await fetch(`/api/courses-v2/${courseId}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: section.title,
            slug: generateSlug(section.title),
            description: ''
          })
        })

        if (!sectionRes.ok) {
          const errorData = await sectionRes.json()
          throw new Error(`Failed to create section "${section.title}": ${errorData.error}`)
        }

        const sectionData = await sectionRes.json()
        const sectionId = sectionData.section?.id || sectionData.module?.id

        if (!sectionId) {
          throw new Error(`No section ID returned for "${section.title}"`)
        }

        // Create lessons for this section
        for (let i = 0; i < section.lessons.length; i++) {
          const lesson = section.lessons[i]
          const videoType = lesson.videoUrl.includes('loom') ? 'loom' : 
                           lesson.videoUrl.includes('youtube') || lesson.videoUrl.includes('youtu.be') ? 'youtube' : 
                           'youtube' // default

          const lessonRes = await fetch(`/api/courses-v2/${courseId}/sections/${sectionId}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: lesson.title,
              slug: generateSlug(lesson.title),
              video_url: lesson.videoUrl,
              video_type: videoType,
              sort_order: i
            })
          })

          if (!lessonRes.ok) {
            const errorData = await lessonRes.json()
            throw new Error(`Failed to create lesson "${lesson.title}": ${errorData.error}`)
          }
        }
      }

      onImportComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to import course')
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Import Course from Google Docs</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Format Instructions:</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Use "SECTION: Title" or "# Title" for section headers</li>
              <li>List lessons with "- Lesson Title: https://video-url"</li>
              <li>Or just "- https://video-url" (title will be auto-generated)</li>
              <li>Supports YouTube and Loom links</li>
            </ul>
            <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Example:</p>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap">
{`SECTION: Introduction
- Welcome: https://youtube.com/watch?v=abc123
- Getting Started: https://loom.com/share/xyz789

SECTION: Advanced Topics
- Deep Dive: https://youtube.com/watch?v=def456`}
              </pre>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Paste your Google Docs content or structured text:
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setPreview([])
                setError(null)
              }}
              placeholder="Paste your content here..."
              className="w-full h-64 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Preview:</h3>
              <div className="space-y-4">
                {preview.map((section, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded p-3">
                    <h4 className="text-sm font-bold text-cyan-400 mb-2">{section.title}</h4>
                    <ul className="space-y-1 ml-4">
                      {section.lessons.map((lesson, lidx) => (
                        <li key={lidx} className="text-xs text-slate-300">
                          • {lesson.title}
                          <span className="text-slate-500 ml-2">({lesson.videoUrl.substring(0, 50)}...)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={!content.trim() || importing}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview
            </button>
            
            {preview.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Course
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

