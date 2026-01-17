import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import CourseDetailClient from './CourseDetailClient'

export const dynamic = 'force-dynamic'

async function getCurrentAffiliate() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  return affiliate
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const affiliate = await getCurrentAffiliate()
  
  if (!affiliate) {
    redirect('/login')
  }

  return <CourseDetailClient affiliate={affiliate} slug={params.slug} />
}

