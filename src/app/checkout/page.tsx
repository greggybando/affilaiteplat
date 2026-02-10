'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CheckoutPage() {
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const sid = searchParams.get('sid')

  useEffect(() => {
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: sid || undefined })
    })
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
  }, [sid])

  if (error) return <div style={{color:'red',padding:'50px'}}>{error}</div>
  return <div style={{padding:'50px'}}>Redirecting to checkout...</div>
}
