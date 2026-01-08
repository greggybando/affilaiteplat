import { redirect } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function ModulePage(_props: Props) {
  // Legacy worksheet-based module pages removed in favor of DB-backed classroom.
  redirect('/dashboard')
}

