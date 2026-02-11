import { Suspense } from 'react'
import CheckoutProductClient from './CheckoutProductClient'

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>}>
      <CheckoutProductClient />
    </Suspense>
  )
}

