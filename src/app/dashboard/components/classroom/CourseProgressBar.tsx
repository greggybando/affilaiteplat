'use client'

interface CourseProgressBarProps {
  courseName: string
  completedLessons: number
  totalLessons: number
  color?: 'emerald' | 'cyan' | 'blue'
}

export function CourseProgressBar({
  courseName,
  completedLessons,
  totalLessons,
  color = 'cyan'
}: CourseProgressBarProps) {
  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const colorClasses = {
    emerald: {
      text: 'from-emerald-400 to-teal-500',
      bar: 'from-emerald-500 to-teal-500'
    },
    cyan: {
      text: 'from-cyan-400 to-blue-500',
      bar: 'from-cyan-500 to-blue-500'
    },
    blue: {
      text: 'from-blue-400 to-indigo-500',
      bar: 'from-blue-500 to-indigo-500'
    }
  }

  const colors = colorClasses[color]

  return (
    <div 
      className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]" 
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Course Progress</h2>
          <p className="text-[rgba(255,255,255,0.6)] text-sm">
            Complete all modules to master {courseName}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold bg-gradient-to-r ${colors.text} bg-clip-text text-transparent`}>
            {percentage}%
          </span>
          <p className="text-[rgba(255,255,255,0.5)] text-sm">Complete</p>
        </div>
      </div>
      <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
        <div 
          className={`bg-gradient-to-r ${colors.bar} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-[rgba(255,255,255,0.5)] text-xs mt-2">
        {completedLessons} of {totalLessons} lessons completed
      </div>
    </div>
  )
}

