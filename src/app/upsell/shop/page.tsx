import { Suspense } from 'react'
import UpsellShopClient from './UpsellShopClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpsellShopClient />
    </Suspense>
  )
}

