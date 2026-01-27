'use client'

interface MentorBadgeProps {
  lifetimePoints: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const getRank = (points: number) => {
  if (points >= 100000) return { name: 'Dragon', color: '#FF4500', icon: '🐉', glow: 'dragon' }
  if (points >= 50000) return { name: 'Rune', color: '#00BFFF', icon: '🛡️', glow: 'rune' }
  if (points >= 15000) return { name: 'Adamant', color: '#228B22', icon: '🛡️', glow: 'adamant' }
  if (points >= 5000) return { name: 'Mithril', color: '#4B0082', icon: '🛡️', glow: 'mithril' }
  if (points >= 2000) return { name: 'Steel', color: '#C0C0C0', icon: '🛡️', glow: 'steel' }
  if (points >= 500) return { name: 'Iron', color: '#434343', icon: '🛡️', glow: 'iron' }
  if (points >= 250) return { name: 'Bronze', color: '#CD7F32', icon: '🛡️', glow: 'bronze' }
  return null
}

export default function MentorBadge({ lifetimePoints, showLabel = true, size = 'md' }: MentorBadgeProps) {
  const rank = getRank(lifetimePoints)
  if (!rank) return null
  
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }

  return (
    <span className={`inline-flex items-center gap-1 ${sizes[size]}`}>
      <span className={`mentor-badge ${rank.glow}`} style={{ color: rank.color }}>
        {rank.icon}
      </span>
      {showLabel && <span style={{ color: rank.color }} className="font-semibold">{rank.name}</span>}
    </span>
  )
}

