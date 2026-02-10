// src/app/upsell/join/JoinPitchClient.tsx
// Final page in the funnel after upsell shop.
// Pitches the LifeDesign subscription. NO affiliate ref — this is your revenue.

'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function JoinPitchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const handleJoin = () => {
    // Go to LifeDesign signup/checkout - NO ref param, NO sid
    // This is YOUR subscription revenue
    window.location.href = '/checkout'
  }

  const handleSkip = () => {
    // Go to delivery/thank-you page with their purchases
    const params = new URLSearchParams()
    if (sessionId) params.set('session_id', sessionId)
    router.push(`/upsell/thankyou?${params.toString()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        {/* Hook */}
        <p style={{ 
          fontSize: 14, 
          color: '#f5c542', 
          textTransform: 'uppercase', 
          letterSpacing: 3, 
          marginBottom: 16,
          fontWeight: 600,
        }}>
          One More Thing
        </p>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 20,
        }}>
          What if you could <span style={{ color: '#f5c542' }}>sell these products yourself</span> and earn commissions using AI-powered tools?
        </h1>

        <p style={{
          fontSize: 20,
          color: '#aaa',
          lineHeight: 1.6,
          marginBottom: 40,
          maxWidth: 550,
          margin: '0 auto 40px',
        }}>
          LifeDesign gives you a complete system to build income online — 
          courses, community, AI tools, and a built-in affiliate program 
          that pays you for every sale.
        </p>

        {/* Value props */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 48,
          textAlign: 'left',
        }}>
          {[
            { icon: '🎓', title: 'Full Course Library', desc: 'Mindset, career, income — all the training' },
            { icon: '🤖', title: 'AI-Powered Tools', desc: 'Let AI help you create & sell content' },
            { icon: '💰', title: 'Earn Commissions', desc: 'Sell these products & keep a % of every sale' },
            { icon: '👥', title: 'Community Access', desc: 'Network with other entrepreneurs' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: 20,
              background: '#111',
              borderRadius: 12,
              border: '1px solid #222',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          padding: '32px 24px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 16,
          border: '1px solid #333',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Start for just</p>
          <p style={{ fontSize: 48, fontWeight: 800, color: '#f5c542', marginBottom: 20 }}>
            $40<span style={{ fontSize: 20, color: '#888' }}>/mo</span>
          </p>

          <button
            onClick={handleJoin}
            style={{
              background: 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
              color: '#000',
              border: 'none',
              padding: '18px 48px',
              fontSize: 20,
              fontWeight: 700,
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245, 197, 66, 0.3)',
              width: '100%',
              maxWidth: 400,
            }}
          >
            Join LifeDesign →
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            fontSize: 14,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '8px 16px',
          }}
        >
          No thanks, take me to my purchase
        </button>
      </div>
    </div>
  )
}

