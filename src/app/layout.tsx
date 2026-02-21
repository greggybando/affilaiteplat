import type { Metadata } from 'next'
import Script from 'next/script'
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
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Script src="https://cdn.firstpromoter.com/fpr.js" strategy="beforeInteractive" />
        <Script id="firstpromoter-init" strategy="beforeInteractive">
          {`(function(w){w.fpr=w.fpr||function(){w.fpr.q =
          w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
          fpr("init", {cid:"7k7myne5"}); fpr("click");`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
