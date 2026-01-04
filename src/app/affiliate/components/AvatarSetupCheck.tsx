'use client'

import { useState, useEffect } from 'react'
import { AvatarSetupModal } from './AvatarSetupModal'

export function AvatarSetupCheck({ affiliate }: { affiliate: any }) {
  const [showModal, setShowModal] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only show modal if avatar_name is not set
    if (!affiliate.avatar_name && !hasChecked) {
      setShowModal(true)
      setHasChecked(true)
    }
  }, [affiliate.avatar_name, hasChecked])

  function handleSuccess() {
    // Reload page to get updated affiliate data
    window.location.reload()
  }

  return (
    <AvatarSetupModal
      isOpen={showModal}
      onClose={() => {
        // Don't allow closing if avatar_name is not set
        if (!affiliate.avatar_name) {
          return
        }
        setShowModal(false)
      }}
      onSuccess={handleSuccess}
    />
  )
}




