'use client'

import { useEffect } from 'react'

export function ProductCookieSetter({ productSlug }: { productSlug: string }) {
  useEffect(() => {
    // Set the product cookie for checkout tracking
    document.cookie = `product=${productSlug}; path=/; max-age=${60 * 60 * 24}; samesite=lax`
  }, [productSlug])

  return null
}
