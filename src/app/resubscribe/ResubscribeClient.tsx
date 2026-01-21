'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import type { Affiliate, AffiliateStats } from '@/lib/supabase'

export function ResubscribeClient({
  affiliate,
  stats,
}: {
  affiliate: Affiliate
  stats: AffiliateStats | null
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to create checkout session')
      setIsLoading(false)
    }
  }

  const totalEarnings = stats
    ? (stats.pending_cents + stats.approved_cents + stats.locked_cents + stats.paid_cents) / 100
    : 0
  const totalConversions = stats?.total_conversions || 0

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative" style={{
              animation: 'lightning 4s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.7))'
            }}>
              <Zap className="w-12 h-12 text-cyan-400" fill="currentColor" style={{
                filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 1))'
              }} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{
                textShadow: '0 0 20px rgba(34, 211, 238, 0.9), 0 0 40px rgba(6, 182, 212, 0.8)',
                letterSpacing: '0.05em',
                fontWeight: 700
              }}>
                LIFE DESIGN
              </span>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes lightning {
            0%, 90%, 100% { opacity: 1; transform: scale(1); }
            5%, 10% { opacity: 0.3; transform: scale(0.95); }
            7.5% { opacity: 1; transform: scale(1.1); }
          }
          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 30px rgba(6,182,212,0.4), inset 0 0 20px rgba(6,182,212,0.1);
            }
            50% { 
              box-shadow: 0 0 40px rgba(6,182,212,0.6), inset 0 0 25px rgba(6,182,212,0.15);
            }
          }
        `}</style>

        <div 
          className="rounded-2xl border overflow-hidden relative"
          style={{
            background: 'rgba(26,26,46,0.8)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)'
          }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>

          {/* Header */}
          <div className="relative z-10 p-8 text-center border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <h1 className="text-3xl font-bold text-white mb-3">
              Your Subscription Has Ended
            </h1>
            <p className="text-[rgba(255,255,255,0.6)] text-lg">
              Resubscribe to restore access to LifeDesign Platform
            </p>
          </div>

          {/* Frozen Stats */}
          <div className="relative z-10 p-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Your Frozen Stats</h2>
            <div className="grid grid-cols-2 gap-6">
              <div 
                className="rounded-lg p-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.1)'
                }}
              >
                <p className="text-sm text-[rgba(255,255,255,0.6)] mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
              </div>
              <div 
                className="rounded-lg p-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.1)'
                }}
              >
                <p className="text-sm text-[rgba(255,255,255,0.6)] mb-1">Total Conversions</p>
                <p className="text-3xl font-bold text-white">{totalConversions}</p>
              </div>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mt-4">
              Your stats are frozen until you resubscribe. Once you resubscribe, you'll regain full access to your portal and can continue earning commissions.
            </p>
          </div>

          {/* Subscription Options */}
          <div className="relative z-10 p-8">
            <h2 className="text-3xl font-semibold text-white mb-2 text-center">Choose Your Plan</h2>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6 text-center">No Commitments. No Hidden Fees. Cancel Anytime.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`p-6 rounded-lg border-2 transition-all relative overflow-hidden ${
                  selectedPlan === 'monthly' ? '' : ''
                }`}
                style={selectedPlan === 'monthly' ? {
                  background: 'rgba(6,182,212,0.1)',
                  borderColor: 'rgba(6,182,212,0.5)',
                  boxShadow: '0 0 30px rgba(6,182,212,0.4), inset 0 0 20px rgba(6,182,212,0.1)',
                  animation: 'pulse-glow 2s ease-in-out infinite'
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 0 10px rgba(6,182,212,0.1)'
                }}
                onMouseEnter={(e) => {
                  if (selectedPlan !== 'monthly') {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(6,182,212,0.2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPlan !== 'monthly') {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(6,182,212,0.1)'
                  }
                }}
              >
                <div className="text-center relative z-10">
                  <p 
                    className="text-5xl font-bold mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #06b6d4, #3b82f6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    $40
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">per month</p>
                  {selectedPlan === 'monthly' && (
                    <p className="text-xs text-cyan-400 mt-2 font-semibold">✓ Selected</p>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`p-6 rounded-lg border-2 transition-all relative overflow-hidden ${
                  selectedPlan === 'yearly' ? '' : ''
                }`}
                style={selectedPlan === 'yearly' ? {
                  background: 'rgba(6,182,212,0.1)',
                  borderColor: 'rgba(6,182,212,0.5)',
                  boxShadow: '0 0 30px rgba(6,182,212,0.4), inset 0 0 20px rgba(6,182,212,0.1)',
                  animation: 'pulse-glow 2s ease-in-out infinite'
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 0 10px rgba(6,182,212,0.1)'
                }}
                onMouseEnter={(e) => {
                  if (selectedPlan !== 'yearly') {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(6,182,212,0.2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPlan !== 'yearly') {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(6,182,212,0.1)'
                  }
                }}
              >
                <div className="text-center relative z-10">
                  <p 
                    className="text-5xl font-bold mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #06b6d4, #3b82f6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    $360
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">per year</p>
                  <p 
                    className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                      color: '#0f0f1a',
                      boxShadow: '0 0 15px rgba(16,185,129,0.5)',
                      textShadow: 'none'
                    }}
                  >
                    save $120 that you'd spend anyway!
                  </p>
                  <p className="text-xs text-white mt-1">Save 25%</p>
                  {selectedPlan === 'yearly' && (
                    <p className="text-xs text-cyan-400 mt-2 font-semibold">✓ Selected</p>
                  )}
                </div>
              </button>
            </div>

            {/* Motivational Text */}
            <div className="mt-6 mb-6">
              <p className="text-sm text-white leading-relaxed text-center max-w-xl mx-auto">
                P.S: The craziest part is there's literally NOTHING better for you to spend $40 on that exists. You are built for too much more to ever settle, and I want you to live the life that makes you smile every f***ing day. i've carefully hand-selected & curated every possible skill/mental model you possibly need to do that inside. Subscribe below and i'll see you there. Hope you're ready to LEVEL TF UP.
              </p>
            </div>

            {/* What You Get */}
            <div className="mt-8 mb-6">
              <h3 className="text-2xl font-semibold text-white mb-6 text-center">What you get:</h3>
              
              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
                <div 
                  className="p-5 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    boxShadow: '0 0 15px rgba(6,182,212,0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 text-xl font-bold mt-0.5">✓</div>
                    <p className="text-sm text-white leading-relaxed flex-1">
                      World-class, hand-crafted courses specifically designed to fix your life (by helping you avoid the most common traps in today's modern world)
                    </p>
                  </div>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    boxShadow: '0 0 15px rgba(6,182,212,0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 text-xl font-bold mt-0.5">✓</div>
                    <p className="text-sm text-white leading-relaxed flex-1">
                      Access to done-for-you digital products (plus exactly how to market them) that can get your online income stream up & running ASAP (allowing you to travel the world and make money on your own terms while learning money-making skills that allow you to perpetually say "F U")
                    </p>
                  </div>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    boxShadow: '0 0 15px rgba(6,182,212,0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 text-xl font-bold mt-0.5">✓</div>
                    <p className="text-sm text-white leading-relaxed flex-1">
                      A 'life design' roadmap that shows you exactly how to actually get to your dreams, step-by-step
                    </p>
                  </div>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    boxShadow: '0 0 15px rgba(6,182,212,0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-cyan-400 text-xl font-bold mt-0.5">✓</div>
                    <p className="text-sm text-white leading-relaxed flex-1">
                      A cult of life-minded people dedicated to living amazing lives & doing fun sh*t 24/7
                    </p>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center mb-8">
                <p className="text-lg text-cyan-400 font-semibold">jump in :)</p>
              </div>

              {/* Value Proposition */}
              <div 
                className="p-6 rounded-lg mb-6 max-w-3xl mx-auto"
                style={{
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.2)'
                }}
              >
                <p className="text-base text-white font-semibold mb-4 text-center">
                  Every year you don't know how to make an extra $10,000 = $10,000
                </p>
                <div className="space-y-3 text-sm text-white leading-relaxed">
                  <p>
                    Now - this $10,000 could be either by getting a remote job that pays you more (exactly what we show you how to do inside....)
                  </p>
                  <p>
                    or by learning highly-leveraged digital money-making skills like shortform ai content + digital product creation.
                  </p>
                  <p>
                    I have the products for you to sell.... I have the software so you can make the content... I show you how to market it... (after going viral whenever I want)
                  </p>
                </div>
              </div>

              {/* Closing Statement */}
              <div className="text-center space-y-2">
                <p className="text-base text-white italic">
                  it's impossible to fail if you apply yourself.
                </p>
                <p className="text-xl text-cyan-400 font-bold">
                  it's time.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full py-4 px-6 font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                boxShadow: isLoading 
                  ? '0 0 10px rgba(34,211,238,0.3)' 
                  : '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
                color: '#0f0f1a'
              }}
            >
              <span className="relative z-10 font-bold">
                {isLoading
                  ? 'Processing...'
                  : selectedPlan === 'monthly'
                  ? 'Resubscribe for $40/month'
                  : 'Resubscribe for $360/year'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
            
            <p className="text-xs text-[rgba(255,255,255,0.5)] text-center mt-4">
              Cancel anytime. Your links stay active as long as you're subscribed.
            </p>
          </div>
        </div>

        {/* Help */}
        <p className="text-center text-[rgba(255,255,255,0.6)] text-sm mt-6">
          Questions?{' '}
          <a href="mailto:support@yourdomain.com" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}


