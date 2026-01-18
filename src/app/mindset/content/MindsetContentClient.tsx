'use client'

import { useState, useEffect } from 'react'
import { MindsetModuleList } from '../components/MindsetModuleList'

interface MindsetContentClientProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role?: string
    [key: string]: any
  }
}

export function MindsetContentClient({ affiliate }: MindsetContentClientProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/courses/structure?courseType=mindset')
        if (!res.ok) {
          throw new Error('Failed to fetch mindset course data')
        }
        const data = await res.json()
        
        // Extract categories and modules from the API response
        const categoriesList = data.categories || []
        const modulesList: any[] = []
        
        categoriesList.forEach((category: any) => {
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
                  loomId: video.loom_id || video.loomId,
                  youtubeId: video.youtube_id || video.youtubeId,
                })),
                categoryId: category.id || category.category_id,
                categoryTitle: category.title || '',
              })
            })
          }
        })
        
        setCategories(categoriesList)
        setModules(modulesList)
      } catch (error) {
        console.error('Error fetching mindset course data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12 text-white">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-slate-400">Loading course content...</p>
      </div>
    )
  }

  return (
    <MindsetModuleList
      modules={modules}
      categories={categories}
      affiliate={affiliate}
      onDataChange={() => {
        // Refresh data if needed
        window.location.reload()
      }}
    />
  )
}

