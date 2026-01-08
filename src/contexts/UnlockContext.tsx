'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'

interface UnlockState {
  moduleUnlockStatus: Record<number, boolean>
  isLoading: boolean
  courseType: 'dreamjob' | 'mindset' | null
}

interface UnlockContextValue {
  moduleUnlockStatus: Record<number, boolean>
  isLoading: boolean
  courseType: 'dreamjob' | 'mindset' | null
  initializeForCourse: (courseType: 'dreamjob' | 'mindset', moduleIds: number[]) => Promise<void>
  markModuleUnlocked: (moduleId: number) => void
  refreshFromAPI: () => Promise<void>
}

const UnlockContext = createContext<UnlockContextValue | null>(null)

export function UnlockProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UnlockState>({
    moduleUnlockStatus: {},
    isLoading: true,
    courseType: null,
  })
  
  const initializedRef = useRef(false)

  const initializeForCourse = useCallback(async (courseType: 'dreamjob' | 'mindset', moduleIds: number[]) => {
    if (initializedRef.current) {
      return
    }
    
    initializedRef.current = true
    setState(prev => ({ ...prev, isLoading: true, courseType }))
    
    try {
      // First, try the NEW direct module unlocks API (simple and reliable)
      const unlockMap: Record<number, boolean> = {}
      
      try {
        const moduleUnlocksRes = await fetch(`/api/user/module-unlocks?course=${courseType}`)
        const moduleUnlocksData = await moduleUnlocksRes.json()
        
        console.log('[UnlockContext] Module unlocks API Response:', moduleUnlocksData)
        
        if (moduleUnlocksData.unlockedModules && Array.isArray(moduleUnlocksData.unlockedModules)) {
          moduleUnlocksData.unlockedModules.forEach((moduleId: number) => {
            unlockMap[moduleId] = true
            console.log(`[UnlockContext] Module ${moduleId} unlocked (from direct API)`)
          })
        }
      } catch (e) {
        console.log('[UnlockContext] Module unlocks API not available, using legacy API')
      }
      
      // Also fetch from the legacy API to merge any additional unlocks
      const res = await fetch(`/api/user/unlocks?courseType=${courseType}`)
      const data = await res.json()
      
      console.log('[UnlockContext] Legacy API Response:', data)
      
      if (data.sections) {
        data.sections.forEach((section: any) => {
          const numericId = section.section_id
          const isUnlocked = section.unlocked === true || section.checkpointStatus === 'approved'
          
          if (numericId && typeof numericId === 'number' && isUnlocked) {
            unlockMap[numericId] = true
            console.log(`[UnlockContext] Section ${numericId} "${section.title}": unlocked (from legacy API)`)
          }
        })
      }
      
      console.log('[UnlockContext] Final unlockMap:', unlockMap)
      
      setState(prev => ({
        ...prev,
        moduleUnlockStatus: unlockMap,
        isLoading: false,
      }))
    } catch (error) {
      console.error('[UnlockContext] Error initializing:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const markModuleUnlocked = useCallback((moduleId: number) => {
    console.log('[UnlockContext] markModuleUnlocked called with:', moduleId)
    
    // Update local state immediately
    setState(prev => {
      const newStatus = {
        ...prev.moduleUnlockStatus,
        [moduleId]: true,
      }
      console.log('[UnlockContext] New moduleUnlockStatus:', newStatus)
      return {
        ...prev,
        moduleUnlockStatus: newStatus,
      }
    })
    
    // Also persist to database via API
    fetch('/api/user/module-unlocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        moduleId, 
        courseType: state.courseType || 'dreamjob' 
      })
    }).then(res => {
      if (res.ok) {
        console.log(`[UnlockContext] Module ${moduleId} unlock persisted to database`)
      } else {
        console.error(`[UnlockContext] Failed to persist module ${moduleId} unlock`)
      }
    }).catch(err => {
      console.error('[UnlockContext] Error persisting unlock:', err)
    })
  }, [state.courseType])

  const refreshFromAPI = useCallback(async () => {
    if (!state.courseType) return
    
    try {
      const res = await fetch(`/api/user/unlocks?courseType=${state.courseType}`)
      const data = await res.json()
      
      if (data.sections) {
        setState(prev => {
          const newStatus = { ...prev.moduleUnlockStatus }
          
          data.sections.forEach((section: any) => {
            if (section.section_id && typeof section.section_id === 'number') {
              // Only ADD unlocks, never remove them
              if (section.unlocked === true) {
                newStatus[section.section_id] = true
              }
            }
          })
          
          console.log('[UnlockContext] Refreshed from API:', newStatus)
          return {
            ...prev,
            moduleUnlockStatus: newStatus,
          }
        })
      }
    } catch (error) {
      console.error('[UnlockContext] Error refreshing:', error)
    }
  }, [state.courseType])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    moduleUnlockStatus: state.moduleUnlockStatus,
    isLoading: state.isLoading,
    courseType: state.courseType,
    initializeForCourse,
    markModuleUnlocked,
    refreshFromAPI,
  }), [state.moduleUnlockStatus, state.isLoading, state.courseType, initializeForCourse, markModuleUnlocked, refreshFromAPI])

  return (
    <UnlockContext.Provider value={value}>
      {children}
    </UnlockContext.Provider>
  )
}

// Helper hook that returns unlock status + checker function
export function useUnlockContext() {
  const context = useContext(UnlockContext)
  
  if (!context) {
    console.warn('[UnlockContext] Context not found, using defaults')
    return {
      moduleUnlockStatus: {} as Record<number, boolean>,
      isLoading: false,
      courseType: null,
      initializeForCourse: async () => {},
      markModuleUnlocked: () => {},
      refreshFromAPI: async () => {},
      // Helper function
      isModuleUnlocked: (moduleId: number, defaultUnlockedIds: number[] = []) => {
        return defaultUnlockedIds.includes(moduleId)
      },
    }
  }
  
  // Create isModuleUnlocked helper that reads CURRENT state from context
  const isModuleUnlocked = (moduleId: number, defaultUnlockedIds: number[] = []) => {
    if (defaultUnlockedIds.includes(moduleId)) {
      return true
    }
    return context.moduleUnlockStatus[moduleId] === true
  }
  
  return {
    ...context,
    isModuleUnlocked,
  }
}
