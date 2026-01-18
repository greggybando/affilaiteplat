'use client'

import { useState, useEffect } from 'react'
import { DreamJobModuleList } from '../components/DreamJobModuleList'

interface DreamJobContentClientProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role?: string
    [key: string]: any
  }
}

export function DreamJobContentClient({ affiliate }: DreamJobContentClientProps) {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/courses/structure?courseType=dreamjob')
        if (!res.ok) {
          throw new Error('Failed to fetch dreamjob course data')
        }
        const data = await res.json()
        
        // Extract modules from the API response
        const modulesList: any[] = []
        
        if (data.categories && Array.isArray(data.categories)) {
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
        }
        
        setModules(modulesList)
      } catch (error) {
        console.error('Error fetching dreamjob course data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12 text-white">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <p className="mt-4 text-slate-400">Loading course content...</p>
      </div>
    )
  }

  return (
    <DreamJobModuleList
      modules={modules}
      affiliate={affiliate}
      onVideoSelect={() => {}}
      onDataChange={() => {
        // Refresh data if needed
        window.location.reload()
      }}
    />
  )
}

