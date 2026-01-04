'use client'

import { useState } from 'react'
import { SubscriptionModal } from './SubscriptionModal'

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const urgency = daysLeft <= 2

  return (
    <>
      <div
        className={`px-4 py-3 text-center text-sm font-medium ${
          urgency
            ? 'bg-red-500/20 text-red-300 border-b border-red-500/30'
            : 'bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30'
        }`}
      >
        {daysLeft <= 0 ? (
          <>
            Your free trial ends today!{' '}
            <button
              onClick={() => setIsModalOpen(true)}
              className="underline font-semibold hover:text-white transition-colors"
            >
              Subscribe now
            </button>{' '}
            to keep your links active.
          </>
        ) : (
          <>
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial.{' '}
            <button
              onClick={() => setIsModalOpen(true)}
              className="underline font-semibold hover:text-white transition-colors"
            >
              Subscribe now
            </button>{' '}
            to lock in your earnings.
          </>
        )}
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        daysLeft={daysLeft}
      />
    </>
  )
}
