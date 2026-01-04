'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

type Battle = {
  id: string
  challenger_pod: { id: string; name: string }
  defender_pod: { id: string; name: string }
  product: { id: string; name: string }
  status: string
  duration_days: number
  start_date: string | null
  end_date: string | null
  prize_type: string
  forfeit_requested_by_pod_id?: string | null
  forfeit_status?: string | null
  challengerStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  defenderStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  challengerMemberCount: number
  defenderMemberCount: number
}

type MemberStat = {
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
  podName: string
  podId: string
  revenue: number
  conversions: number
}

type PodData = {
  name: string
  level: string
  levelNum: number
  revenue: number
  conversions: number
  salesPerMember: number
  sales24Hours: number
  isLeading: boolean
  sigil: string
  imageUrl: string | null
}

interface AnimatedBattleDisplayProps {
  battle: Battle
  currentPodId: string
  isPodLeader?: boolean
}

export function AnimatedBattleDisplay({ battle, currentPodId, isPodLeader = false }: AnimatedBattleDisplayProps) {
  const [hasClashed, setHasClashed] = useState(false)
  const [showExplosion, setShowExplosion] = useState(false)
  const [showCashExplosion, setShowCashExplosion] = useState(false)
  const [showAvatar, setShowAvatar] = useState(false)
  const [avatarShooting, setAvatarShooting] = useState(false)
  const [avatarFading, setAvatarFading] = useState(false)
  const [challengerClass, setChallengerClass] = useState<{ level: number; name: string; sales: number } | null>(null)
  const [defenderClass, setDefenderClass] = useState<{ level: number; name: string; sales: number } | null>(null)
  const [memberStats, setMemberStats] = useState<MemberStat[]>([])
  const [topPerformer, setTopPerformer] = useState<MemberStat | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Timeline animations
    const clashTimer = setTimeout(() => setHasClashed(true), 100)
    const explosionTimer = setTimeout(() => {
      setShowExplosion(true)
      setShowCashExplosion(true)
    }, 700)
    const hideExplosion = setTimeout(() => setShowExplosion(false), 1500)
    
    const avatarTimer = setTimeout(() => {
      setShowAvatar(true)
      setAvatarShooting(true)
    }, 1500)
    const fadeTimer = setTimeout(() => setAvatarFading(true), 5500)
    const hideAvatarTimer = setTimeout(() => setShowAvatar(false), 6500)

    // Refresh stats every 30 seconds
    const refreshInterval = setInterval(fetchData, 30000)

    return () => {
      clearTimeout(clashTimer)
      clearTimeout(explosionTimer)
      clearTimeout(hideExplosion)
      clearTimeout(avatarTimer)
      clearTimeout(fadeTimer)
      clearTimeout(hideAvatarTimer)
      clearInterval(refreshInterval)
    }
  }, [battle.id])

  async function fetchData() {
    try {
      const [challengerRes, defenderRes, statsRes] = await Promise.all([
        fetch(`/api/pods/weight-class?podId=${battle.challenger_pod.id}`),
        fetch(`/api/pods/weight-class?podId=${battle.defender_pod.id}`),
        fetch(`/api/pods/battles/member-stats?battleId=${battle.id}`),
      ])
      
      const challengerData = await challengerRes.json()
      const defenderData = await defenderRes.json()
      const statsData = await statsRes.json()
      
      setChallengerClass(challengerData.weightClass)
      setDefenderClass(defenderData.weightClass)
      setMemberStats(statsData.memberStats || [])
      setTopPerformer(statsData.topPerformer || null)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching battle data:', error)
      setLoading(false)
    }
  }

  function formatTimeRemaining(endDate: string): string {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return `${days}`
  }

  function getPodSigil(level: number): string {
    switch (level) {
      case 4: return '👑'
      case 3: return '⚔️'
      case 2: return '🐺'
      default: return '🌱'
    }
  }

  const isChallenger = battle.challenger_pod.id === currentPodId
  const challengerStats = (battle.challengerStats || { total_sales: 0, total_conversions: 0, salesPerMember: 0, sales24Hours: 0 }) as any
  const defenderStats = (battle.defenderStats || { total_sales: 0, total_conversions: 0, salesPerMember: 0, sales24Hours: 0 }) as any
  
  const challengerRevenue = challengerStats.total_sales / 100
  const defenderRevenue = defenderStats.total_sales / 100
  const challengerSalesPerMember = challengerStats.salesPerMember / 100
  const defenderSalesPerMember = defenderStats.salesPerMember / 100
  const isChallengerLeading = challengerSalesPerMember > defenderSalesPerMember

  const pods: PodData[] = [
    {
      name: battle.challenger_pod.name,
      level: challengerClass?.name || 'Startup Squad',
      levelNum: challengerClass?.level || 1,
      revenue: challengerRevenue,
      conversions: challengerStats.total_conversions || 0,
      salesPerMember: challengerSalesPerMember,
      sales24Hours: challengerStats.sales24Hours || 0,
      isLeading: isChallengerLeading,
      sigil: getPodSigil(challengerClass?.level || 1),
      imageUrl: null, // Will be added when pod image_url column exists
    },
    {
      name: battle.defender_pod.name,
      level: defenderClass?.name || 'Startup Squad',
      levelNum: defenderClass?.level || 1,
      revenue: defenderRevenue,
      conversions: defenderStats.total_conversions || 0,
      salesPerMember: defenderSalesPerMember,
      sales24Hours: defenderStats.sales24Hours || 0,
      isLeading: !isChallengerLeading && defenderSalesPerMember > 0,
      sigil: getPodSigil(defenderClass?.level || 1),
      imageUrl: null, // Will be added when pod image_url column exists
    },
  ]

  // Cash explosion particles
  const cashExplosion = [...Array(20)].map((_, i) => ({
    id: i,
    angle: (i / 20) * 360 + Math.random() * 20,
    distance: 150 + Math.random() * 200,
    duration: 1 + Math.random() * 0.5,
    type: '💵',
    size: 20 + Math.random() * 16,
    rotation: Math.random() * 720 - 360
  }))

  // Money gun bullets
  const moneyBullets = [...Array(20)].map((_, i) => ({
    id: i,
    delay: i * 0.2,
    angle: -45 + Math.random() * 90,
    distance: 100 + Math.random() * 150
  }))

  const prizeText = battle.prize_type === 'commission_boost' ? '+10% Boost' : 
                    battle.prize_type === 'member_steal' ? 'Winner Takes a Pick' : 
                    'Bragging Rights'

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Loading battle...</div>
  }

  return (
    <div style={{
      background: 'linear-gradient(165deg, #1a2a28 0%, #1e3533 50%, #243a38 100%)',
      padding: '50px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .pool-glow {
          position: fixed;
          bottom: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 140%;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 40%, transparent 70%);
          pointer-events: none;
          animation: poolPulse 8s ease-in-out infinite;
        }
        
        @keyframes poolPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        .cash-explode {
          position: absolute;
          pointer-events: none;
          z-index: 50;
          animation: cashExplode ease-out forwards;
        }
        
        @keyframes cashExplode {
          0% {
            transform: translate(-50%, -50%) translateX(0) translateY(0) rotate(0deg) scale(0.5);
            opacity: 1;
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) translateX(var(--tx)) translateY(var(--ty)) rotate(var(--rot)) scale(1.2);
          }
          100% {
            transform: translate(-50%, -50%) translateX(var(--tx)) translateY(calc(var(--ty) + 300px)) rotate(var(--rot)) scale(0.8);
            opacity: 0;
          }
        }
        
        .avatar-container {
          position: fixed;
          bottom: 50px;
          right: 50px;
          z-index: 100;
          opacity: 0;
          transition: opacity 1s ease-out;
        }
        
        .avatar-container.visible {
          opacity: 1;
          animation: avatarEnter 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .avatar-container.fading {
          opacity: 0;
        }
        
        @keyframes avatarEnter {
          0% { 
            transform: scale(0) rotate(-180deg); 
            opacity: 0;
          }
          100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 1;
          }
        }
        
        .avatar-body {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          box-shadow: 0 10px 40px rgba(251, 191, 36, 0.5);
        }
        
        .avatar-body.dancing {
          animation: avatarDance 0.3s ease-in-out infinite;
        }
        
        @keyframes avatarDance {
          0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); }
          50% { transform: translateY(-10px) rotate(3deg) scale(1.05); }
        }
        
        .money-gun {
          position: absolute;
          right: -60px;
          top: 25px;
          transform: rotate(-10deg);
        }
        
        .gun-body {
          width: 70px;
          height: 35px;
          background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
          border-radius: 5px 15px 5px 5px;
          position: relative;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
        }
        
        .gun-handle {
          width: 18px;
          height: 25px;
          background: linear-gradient(180deg, #1a1a1a 0%, #333 100%);
          border-radius: 3px;
          position: absolute;
          bottom: -18px;
          left: 12px;
          transform: rotate(-15deg);
        }
        
        .gun-barrel {
          width: 25px;
          height: 12px;
          background: #1a1a1a;
          position: absolute;
          right: -10px;
          top: 11px;
          border-radius: 0 6px 6px 0;
        }
        
        .avatar-arm {
          position: absolute;
          right: -40px;
          top: 30px;
          width: 50px;
          height: 15px;
          background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 8px;
          transform-origin: left center;
        }
        
        .avatar-arm.shooting {
          animation: armRecoil 0.3s ease-out infinite;
        }
        
        @keyframes armRecoil {
          0%, 60%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(15deg) translateX(-5px); }
        }
        
        .money-gun.shooting {
          animation: gunRecoil 0.3s ease-out infinite;
        }
        
        @keyframes gunRecoil {
          0%, 60%, 100% { transform: rotate(-10deg) translateX(0); }
          30% { transform: rotate(-25deg) translateX(-10px); }
        }
        
        .money-bullet {
          position: absolute;
          right: 100px;
          top: 40px;
          font-size: 28px;
          pointer-events: none;
          opacity: 0;
        }
        
        .money-bullet.fire {
          animation: bulletFly 0.8s ease-out infinite;
        }
        
        @keyframes bulletFly {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(var(--distance)) translateY(var(--lift)) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        
        .muzzle-flash {
          position: absolute;
          right: 85px;
          top: 30px;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(251,191,36,0.8) 30%, transparent 70%);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }
        
        .muzzle-flash.fire {
          animation: muzzleFlash 0.3s ease-out infinite;
        }
        
        @keyframes muzzleFlash {
          0%, 50% { opacity: 0; transform: scale(0.5); }
          25% { opacity: 1; transform: scale(1.5); }
        }
        
        .cash-particle {
          position: fixed;
          pointer-events: none;
          animation: particleFloat 15s ease-in-out infinite;
        }
        
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(10deg); opacity: 0.8; }
        }
        
        .team-left {
          transform: translateX(-150%);
          opacity: 0;
          transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .team-left.clashed {
          transform: translateX(0);
          opacity: 1;
        }
        
        .team-right {
          transform: translateX(150%);
          opacity: 0;
          transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .team-right.clashed {
          transform: translateX(0);
          opacity: 1;
        }
        
        .shake {
          animation: screenShake 0.4s ease-out;
        }
        
        @keyframes screenShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px) rotate(-0.5deg); }
          40% { transform: translateX(8px) rotate(0.5deg); }
          60% { transform: translateX(-4px) rotate(-0.25deg); }
          80% { transform: translateX(4px) rotate(0.25deg); }
        }
        
        .explosion-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          pointer-events: none;
        }
        
        .explosion-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          animation: explodeRing 0.6s ease-out forwards;
        }
        
        .explosion-ring.ring1 { border: 3px solid #fbbf24; }
        .explosion-ring.ring2 { border: 3px solid #22c55e; animation-delay: 0.1s; }
        .explosion-ring.ring3 { border: 2px solid #5eead4; animation-delay: 0.2s; }
        
        @keyframes explodeRing {
          0% { width: 20px; height: 20px; opacity: 1; }
          100% { width: 250px; height: 250px; opacity: 0; }
        }
        
        .explosion-flash {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(251,191,36,0.7) 40%, transparent 70%);
          border-radius: 50%;
          animation: flashBurst 0.4s ease-out forwards;
        }
        
        @keyframes flashBurst {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        
        .explosion-sparks {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          background: #fff;
          border-radius: 50%;
          animation: sparkFly 0.6s ease-out forwards;
        }
        
        @keyframes sparkFly {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { opacity: 0; }
        }
        
        .card {
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .card-highlight {
          background: rgba(251, 191, 36, 0.2);
          border-color: rgba(251, 191, 36, 0.5);
          box-shadow: 0 0 40px rgba(251, 191, 36, 0.3), 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        
        .vs-text {
          transition: all 0.3s ease;
        }
        
        .vs-text.clashed {
          animation: vsPulse 0.5s ease-out;
        }
        
        @keyframes vsPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.8); color: #fbbf24; text-shadow: 0 0 30px rgba(251, 191, 36, 0.9); }
          100% { transform: scale(1); }
        }
        
        .money-badge {
          animation: moneyPulse 2s ease-in-out infinite;
        }
        
        @keyframes moneyPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      {/* Environment */}
      <div className="pool-glow"></div>
      
      {/* Ambient cash particles */}
      {[
        { type: '💲', left: '5%', top: '20%', delay: '0s' },
        { type: '💲', left: '92%', top: '35%', delay: '2s' },
        { type: '💵', left: '8%', top: '60%', delay: '1s' },
        { type: '💰', left: '88%', top: '70%', delay: '3s' },
        { type: '💲', left: '15%', top: '80%', delay: '4s' },
        { type: '💸', left: '85%', top: '15%', delay: '2.5s' },
      ].map((p, i) => (
        <div 
          key={i}
          className="cash-particle"
          style={{ 
            left: p.left, 
            top: p.top, 
            fontSize: '24px',
            animationDelay: p.delay 
          }}
        >
          {p.type}
        </div>
      ))}

      {/* Avatar with Money Gun */}
      {showAvatar && (
        <div className={`avatar-container visible ${avatarFading ? 'fading' : ''}`}>
          <div className={`muzzle-flash ${avatarShooting ? 'fire' : ''}`}></div>
          
          {moneyBullets.map((bullet) => (
            <div
              key={bullet.id}
              className={`money-bullet ${avatarShooting ? 'fire' : ''}`}
              style={{
                animationDelay: `${bullet.delay}s`,
                '--distance': `${bullet.distance}px`,
                '--lift': `${-50 - Math.random() * 100}px`
              } as React.CSSProperties}
            >
              💵
            </div>
          ))}
          
          <div className={`avatar-body ${showAvatar && !avatarFading ? 'dancing' : ''}`}>
            <span style={{ marginTop: '8px' }}>😎</span>
            
            <div className={`avatar-arm ${avatarShooting ? 'shooting' : ''}`}></div>
            
            <div className={`money-gun ${avatarShooting ? 'shooting' : ''}`}>
              <div className="gun-body">
                <div className="gun-barrel"></div>
                <div className="gun-handle"></div>
              </div>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            marginTop: '10px',
            color: '#fbbf24',
            fontSize: '14px',
            fontWeight: 700,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            💰 get dat mooonayy! 💰
          </div>
        </div>
      )}

      <div 
        className={hasClashed && showExplosion ? 'shake' : ''}
        style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}
      >
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '42px',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-1px'
          }}>
            You have an active pod war!
          </h1>
        </div>

        {/* Quest Card */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ 
                margin: '0 0 8px 0', 
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Live Battle
              </p>
              <h2 style={{ 
                margin: 0, 
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 700
              }}>
                Product: {battle.product.name}
              </h2>
              <p style={{ 
                margin: '10px 0 0 0',
                color: '#22c55e',
                fontSize: '14px',
                fontWeight: 600
              }}>
                🏆 {prizeText}
              </p>
            </div>
            <div className="money-badge" style={{ 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(34, 197, 94, 0.15))',
              border: '2px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '16px',
              padding: '18px 28px'
            }}>
              <p style={{ margin: 0, color: '#fbbf24', fontSize: '38px', fontWeight: 900 }}>
                {battle.end_date ? formatTimeRemaining(battle.end_date) : '0'}
              </p>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>DAYS LEFT 💵</p>
            </div>
          </div>
        </div>

        {/* Team Battle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 50px 1fr',
          gap: '16px',
          alignItems: 'stretch',
          marginBottom: '24px',
          position: 'relative'
        }}>
          
          {/* Team 1 */}
          <div className={`card ${pods[0].isLeading ? 'card-highlight' : ''} team-left ${hasClashed ? 'clashed' : ''}`} style={{ padding: '24px', position: 'relative' }}>
            {/* IN THE LEAD Banner */}
            {pods[0].isLeading && (
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#1a1a1a',
                padding: '8px 24px',
                borderRadius: '20px',
                fontSize: '16px',
                fontWeight: 900,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(251, 191, 36, 0.5)',
                zIndex: 10,
                whiteSpace: 'nowrap'
              }}>
                ⚡ IN THE LEAD ⚡
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: pods[0].isLeading ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1))' : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                border: pods[0].isLeading ? '2px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {pods[0].imageUrl ? (
                  <img 
                    src={pods[0].imageUrl} 
                    alt={pods[0].name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  pods[0].sigil
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>
                  {pods[0].name}
                </h3>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: pods[0].isLeading ? '#22c55e' : 'rgba(255,255,255,0.4)', fontSize: '28px', fontWeight: 900 }}>💵${pods[0].revenue.toFixed(2)}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Revenue</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>{pods[0].conversions}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sales</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>{pods[0].sales24Hours}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sales (24h)</p>
              </div>
            </div>
            
          </div>

          {/* VS with Explosion + Cash Explosion */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {showExplosion && (
              <div className="explosion-container">
                <div className="explosion-flash"></div>
                <div className="explosion-ring ring1"></div>
                <div className="explosion-ring ring2"></div>
                <div className="explosion-ring ring3"></div>
                {[...Array(12)].map((_, i) => {
                  const angle = (i / 12) * 360;
                  const distance = 60 + Math.random() * 40;
                  return (
                    <div
                      key={i}
                      className="explosion-sparks"
                      style={{
                        animationDelay: `${i * 0.02}s`,
                        transform: `translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * distance}px, ${Math.sin(angle * Math.PI / 180) * distance}px)`,
                        background: ['#fbbf24', '#22c55e', '#5eead4', '#fff'][i % 4]
                      }}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Cash explosion */}
            {showCashExplosion && cashExplosion.map((cash) => {
              const tx = Math.cos(cash.angle * Math.PI / 180) * cash.distance;
              const ty = Math.sin(cash.angle * Math.PI / 180) * cash.distance * 0.6;
              return (
                <div
                  key={cash.id}
                  className="cash-explode"
                  style={{
                    left: '50%',
                    top: '50%',
                    fontSize: `${cash.size}px`,
                    animationDuration: `${cash.duration}s`,
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    '--rot': `${cash.rotation}deg`
                  } as React.CSSProperties}
                >
                  {cash.type}
                </div>
              );
            })}
            
            <span className={`vs-text ${hasClashed ? 'clashed' : ''}`} style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
              fontWeight: 700,
              position: 'relative',
              zIndex: 10
            }}>
              ⚔️
            </span>
          </div>

          {/* Team 2 */}
          <div className={`card ${pods[1].isLeading ? 'card-highlight' : ''} team-right ${hasClashed ? 'clashed' : ''}`} style={{ padding: '24px', position: 'relative' }}>
            {/* IN THE LEAD Banner */}
            {pods[1].isLeading && (
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#1a1a1a',
                padding: '8px 24px',
                borderRadius: '20px',
                fontSize: '16px',
                fontWeight: 900,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(251, 191, 36, 0.5)',
                zIndex: 10,
                whiteSpace: 'nowrap'
              }}>
                ⚡ IN THE LEAD ⚡
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: pods[1].isLeading ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.2))' : 'rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                border: pods[1].isLeading ? '2px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                {pods[1].imageUrl ? (
                  <img 
                    src={pods[1].imageUrl} 
                    alt={pods[1].name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  pods[1].sigil
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>{pods[1].name}</h3>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: pods[1].isLeading ? '#22c55e' : '#ffffff', fontSize: '28px', fontWeight: 900 }}>💵${pods[1].revenue.toFixed(2)}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Revenue</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>{pods[1].conversions}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sales</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>{pods[1].sales24Hours}</p>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sales (24h)</p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Top Performer */}
        {topPerformer && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(34, 197, 94, 0.15))',
            borderRadius: '14px',
            padding: '18px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: '2px solid rgba(251, 191, 36, 0.25)'
          }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500 }}>Top Performer</span>
              <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>{topPerformer.avatarName}</span>
              <span style={{ color: '#22c55e', fontSize: '20px', fontWeight: 900 }}>💵 ${topPerformer.revenue.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {memberStats.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '17px', fontWeight: 700 }}>
              Top Money Makers
            </h3>
              <span style={{ fontSize: '20px' }}>📈</span>
            </div>
            
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 120px 100px',
              gap: '16px',
              padding: '12px 24px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Rank</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Player</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Pod</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Bag 💰</span>
            </div>
            
            {/* Rows */}
            {memberStats.map((player, index) => (
              <div key={player.affiliateId} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 120px 100px',
                gap: '16px',
                padding: '16px 24px',
                alignItems: 'center',
                borderBottom: index < memberStats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: index === 0 ? 'rgba(34, 197, 94, 0.08)' : 'transparent'
              }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: index === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                             index === 1 ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)' :
                             'linear-gradient(135deg, #d97706, #b45309)',
                  color: index === 0 ? '#1a1a10' : index === 1 ? '#1e293b' : '#ffffff'
                }}>
                  {index === 0 ? '👑' : index + 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.avatarName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span style={{
                    color: index === 0 ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    fontSize: '15px',
                    fontWeight: index === 0 ? 600 : 500
                  }}>
                    {player.avatarName} {index === 0 && '🔥'}
                  </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                  {player.podName}
                </span>
                <span style={{
                  color: index === 0 ? '#22c55e' : 'rgba(255,255,255,0.6)',
                  fontSize: '16px',
                  fontWeight: 700,
                  textAlign: 'right'
                }}>
                  ${player.revenue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p style={{ 
          textAlign: 'center',
          marginTop: '32px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px',
          fontWeight: 600
        }}>
          Secure The Bag 💰💸🤑
        </p>
      </div>
    </div>
  )
}

