import { redirect, notFound } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getModule } from '../../data/modules'
import { ModuleContent } from '../../components/ModuleContent'

interface Props {
  params: { id: string }
}

async function checkModuleAccess(userId: string, moduleId: number) {
  if (moduleId === 1) return true
  const { data } = await supabaseAdmin
    .from('user_module_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('section', 'mindset')
    .eq('module_id', moduleId)
    .single()
  return !!data
}

async function getExistingSubmission(userId: string, moduleId: number, worksheetId: string) {
  const { data } = await supabaseAdmin
    .from('worksheet_submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('section', 'mindset')
    .eq('module_id', moduleId)
    .eq('worksheet_id', worksheetId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

export default async function ModulePage({ params }: Props) {
  const moduleId = parseInt(params.id)
  const module = getModule(moduleId)
  if (!module) notFound()

  const affiliate = await getCurrentAffiliate()
  if (!affiliate) redirect('/login')

  const hasAccess = await checkModuleAccess(affiliate.id, moduleId)
  if (!hasAccess) redirect('/mindset/content')

  const existingSubmission = await getExistingSubmission(affiliate.id, moduleId, module.worksheet.id)

  return <ModuleContent module={module} userId={affiliate.id} existingSubmission={existingSubmission} />
}

