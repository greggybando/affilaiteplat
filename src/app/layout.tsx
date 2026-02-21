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
          
          document.addEventListener('DOMContentLoaded', function() {
            var tid = (document.cookie.match(/_fprom_tid=([^;]+)/) || [])[1];
            if (tid) {
              document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(function(a) {
                var url = new URL(a.href);
                url.searchParams.set('client_reference_id', 'fprom_' + tid);
                a.href = url.toString();
              });
            }
          });
        `}} />
      </head>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            var tid = (document.cookie.match(/_fprom_tid=([^;]+)/) || [])[1];
            if (tid && typeof fpr !== 'undefined') {
              // Register visitor as a lead in FirstPromoter
              fpr("referral", {email: null, uid: tid});
            }
          });
        `}} />
      </body>
    </html>
  )
}
