import { Suspense } from 'react'
import JoinPitchClient from './JoinPitchClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPitchClient />
    </Suspense>
  )
}

