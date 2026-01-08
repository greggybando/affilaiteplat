import { redirect } from 'next/navigation'

export default async function MindsetContentPage() {
  // Legacy worksheet-based module pages removed in favor of DB-backed classroom.
  redirect('/dashboard')
}
