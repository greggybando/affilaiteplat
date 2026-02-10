import { Suspense } from 'react'
import ThankYouClient from './ThankYouClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThankYouClient />
    </Suspense>
  )
}

