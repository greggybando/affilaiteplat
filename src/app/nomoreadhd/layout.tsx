import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ADHD Productivity Course — Your Course',
  description: 'Master productivity with ADHD-friendly systems and strategies.',
}

export default function ADHDCourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

