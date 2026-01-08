'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'

interface InboxDropdownProps {
  currentUserId: string
  onOpenDM: (partnerId: string, partnerName?: string, partnerAvatar?: string | null) => void
}

export function InboxDropdown({ currentUserId, onOpenDM }: InboxDropdownProps) {
  // Simple button that opens DM modal - no API dependencies
  return (
    <button
      onClick={() => onOpenDM('', '', null)}
      className="relative p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
      title="Messages"
    >
      <MessageCircle className="w-5 h-5 text-[rgba(255,255,255,0.85)]" />
    </button>
  )
}
