import { redirect } from 'next/navigation'

export default async function MindsetContentPage() {
  // Redirect to dashboard - mindset course is now rendered inline in ClassroomTab
  redirect('/dashboard?tab=classroom')
}
