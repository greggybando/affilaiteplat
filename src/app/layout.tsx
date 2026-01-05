import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Affiliate Platform',
  description: 'Your affiliate marketing hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-gray-950 text-white antialiased" style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
