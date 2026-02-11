'use client'

import { useState } from 'react'

interface BuyButtonProps {
  slug: string
  text?: string
  price?: string
  style?: React.CSSProperties
  className?: string
}

export default function BuyButton({
  slug,
  text = 'Get Instant Access',
  price,
  style,
  className,
}: BuyButtonProps) {
  const handleClick = () => {
    window.location.href = `/checkout/product?slug=${slug}`
  }

  const defaultStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '18px 48px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: '400px',
  }

  return (
    <div style={{ textAlign: 'center', margin: '32px 0' }}>
      <button
        onClick={handleClick}
        style={style || defaultStyle}
        className={className}
      >
        {text}
      </button>
      {price && (
        <p style={{ marginTop: 8, fontSize: 14, color: '#666' }}>{price}</p>
      )}
    </div>
  )
}

