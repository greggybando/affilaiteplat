import { redirect } from 'next/navigation'

// This page is deprecated - all course content is now database-driven
// Redirect to the main dashboard classroom view
export default function DreamJobContentPage() {
  redirect('/dashboard?tab=classroom&world=dreamjob')
}
