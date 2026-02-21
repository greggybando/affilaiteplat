import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata = {
  title: 'Affiliate Platform',
  description: 'Your affiliate marketing hub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var s = document.createElement('script');
            s.src = 'https://cdn.firstpromoter.com/fpr.js';
            s.onload = function(){
              fpr("init", {cid:"7k7myne5"});
              fpr("click");
            };
            document.head.appendChild(s);
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
