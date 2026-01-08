'use client'
import { useState, useEffect } from 'react'

export function useUnlocks(userId: string | undefined) {
  const [unlocks, setUnlocks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetch(`/api/user/unlocks?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setUnlocks(d.unlocks || []); setLoading(false) })
  }, [userId])

  return {
    loading,
    unlocks,
    hasUnlock: (key: string) => unlocks.includes(key),
    hasFirstWorksheet: unlocks.includes('core-reframes'),
    hasDiagnosisWorksheet: unlocks.includes('ld-world-full')
  }
}





