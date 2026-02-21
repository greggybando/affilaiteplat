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
          (function(w){w.fpr=w.fpr||function(){w.fpr.q = w.fpr.q||[];w.fpr.q[arguments[0]=='set'?'unshift':'push'](arguments);};})(window);
          fpr("init", {cid:"7k7myne5"}); 
          fpr("click");
        `}} />
        <script src="https://cdn.firstpromoter.com/fpr.js" async></script>
        <script dangerouslySetInnerHTML={{ __html: `
          function getFPTid() {
            return window.FPROM && window.FPROM.data.tid;
          }
          function initializeFPRPaymentLinks() {
            console.log("initialized fpr on payment links");
            setTimeout(function () {
              var stripePaymentLinks = document.querySelectorAll(
                'a[href^="https://buy.stripe.com/"]'
              );
              stripePaymentLinks.forEach(function (link) {
                var oldStripePaymentUrl = link.getAttribute("href"); 
                var tid = getFPTid();
                if (tid) {
                  var url = new URL(oldStripePaymentUrl);
                  url.searchParams.set('client_reference_id', tid);
                  link.setAttribute("href", url.toString());
                }
              });
            }, 800);
          }
          if (window.attachEvent) {
            window.attachEvent("onload", initializeFPRPaymentLinks);
          } else {
            window.addEventListener("load", initializeFPRPaymentLinks, false);
          }
        `}} />
      </head>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
