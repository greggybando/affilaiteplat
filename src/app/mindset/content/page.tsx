import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { mindsetModules } from '../data/modules'
import { ModuleCard } from '../components/ModuleCard'

async function getUserProgress(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_module_progress')
    .select('module_id, unlocked_at, completed_at')
    .eq('user_id', userId)
    .eq('section', 'mindset')
  return data || []
}

async function getCompletedWorksheets(userId: string) {
  const { data } = await supabaseAdmin
    .from('worksheet_submissions')
    .select('module_id, status')
    .eq('user_id', userId)
    .eq('section', 'mindset')
    .eq('status', 'approved')
  return data || []
}

export default async function MindsetContentPage() {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate) return null

  const [progress, completedWorksheets] = await Promise.all([
    getUserProgress(affiliate.id),
    getCompletedWorksheets(affiliate.id)
  ])

  const unlockedModules = new Set((progress || []).map((p: any) => p.module_id))
  const completedModules = new Set((completedWorksheets || []).map((w: any) => w.module_id))

  if (unlockedModules.size === 0) unlockedModules.add(1)

  const totalModules = mindsetModules.length
  const completedCount = completedModules.size
  const progressPercent = Math.round((completedCount / totalModules) * 100)

  return (
    <div>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Your Progress</h2>
            <p className="text-slate-400 text-sm">Complete each module's worksheet to unlock the next one</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">{progressPercent}%</span>
            <p className="text-slate-500 text-sm">{completedCount} of {totalModules} complete</p>
          </div>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {mindsetModules.map((module, index) => {
          const isUnlocked = unlockedModules.has(module.id)
          const isCompleted = completedModules.has(module.id)
          const isNext = !isUnlocked && index > 0 && unlockedModules.has(mindsetModules[index - 1].id)
          return (
            <ModuleCard key={module.id} module={module} isUnlocked={isUnlocked} isCompleted={isCompleted} isNext={isNext} />
          )
        })}
      </div>
    </div>
  )
}
