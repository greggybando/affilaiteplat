'use client'
import { useEffect, useState } from 'react'

export default function CheckoutPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/checkout', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('Checkout response:', data)
        if (data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
          window.location.href = data.url
        } else {
          console.error('Invalid URL in response:', data.url)
          setError(data.error || 'Failed to create checkout. Invalid URL received.')
        }
      })
      .catch(err => {
        console.error('Checkout error:', err)
        setError('Failed to connect to checkout service')
      })
  }, [])

  if (error) return <div style={{color:'red',padding:'50px'}}>{error}</div>
  return <div style={{padding:'50px'}}>Redirecting to checkout...</div>
}
