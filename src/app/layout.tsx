import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
(function(){var t=document.createElement("script");t.type="text/javascript";t.async=true;t.src="https://cdn.firstpromoter.com/fpr.js";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)})();
fpr("init",{cid:"7k7myne5"});fpr("click");
`}} />
      </head>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
