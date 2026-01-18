import { redirect } from 'next/navigation'

export default async function DreamJobContentPage() {
  // Redirect to dashboard - dreamjob course is now rendered inline in ClassroomTab
  redirect('/dashboard?tab=classroom')
}
