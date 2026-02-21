import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Psychology of the Super-Charismatic — Your Course',
}

export default function CharismaCourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

