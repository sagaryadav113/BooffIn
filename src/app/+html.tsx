import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://letsbooffin.com/#organization',
        'name': 'BooffIn',
        'url': 'https://letsbooffin.com',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://letsbooffin.com/icon-512.png',
        },
        'description': 'A global platform where research finds its people — connecting academics, student researchers, and science enthusiasts.',
        'sameAs': [
          'https://twitter.com/letsbooffin',
          'https://github.com/sagaryadav113/BooffIn'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': 'https://letsbooffin.com/#website',
        'url': 'https://letsbooffin.com',
        'name': 'BooffIn',
        'publisher': {
          '@id': 'https://letsbooffin.com/#organization'
        },
        'description': 'Research finds its people. Connect with researchers, share scientific insights, and discover breakthrough platforms.',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': 'https://letsbooffin.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'SoftwareApplication',
        'name': 'BooffIn',
        'operatingSystem': 'Web, iOS, Android',
        'applicationCategory': 'EducationalApplication, SocialNetworkingApplication',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        }
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover"
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --sat: env(safe-area-inset-top, 0px);
                --sab: env(safe-area-inset-bottom, 0px);
                --sal: env(safe-area-inset-left, 0px);
                --sar: env(safe-area-inset-right, 0px);
              }
              html, body {
                width: 100%;
                height: 100%;
                height: 100dvh;
                margin: 0;
                padding: 0;
                overflow: hidden;
                position: fixed;
                touch-action: pan-x pan-y;
                -webkit-text-size-adjust: 100%;
                overscroll-behavior: none;
              }
              #root {
                width: 100%;
                height: 100%;
                height: 100dvh;
                overflow: hidden;
                display: flex;
              }
              img {
                -webkit-user-drag: none;
                user-select: none;
              }
              input, textarea {
                outline: none !important;
                outline-style: none !important;
              }
              input:focus, textarea:focus {
                outline: none !important;
                outline-style: none !important;
                box-shadow: none !important;
              }
            `,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof document !== 'undefined') {
                document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('touchmove', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
              }
            `,
          }}
        />

        {/* Primary SEO Meta Tags */}
        <title>BooffIn | Research Finds Its People — Scientific Collaboration Platform</title>
        <meta
          name="description"
          content="Join BooffIn — the premier platform connecting researchers, academics, and science enthusiasts globally. Share scientific insights, collaborate on breakthroughs, and discover research."
        />
        <meta
          name="keywords"
          content="BooffIn, letsbooffin, scientific research, academic collaboration, researcher network, biology, AI in science, neuroscience, research papers, scientific discovery"
        />
        <meta name="author" content="BooffIn Inc." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://www.letsbooffin.com" />

        {/* Open Graph / Facebook / WhatsApp / LinkedIn */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsbooffin.com" />
        <meta property="og:title" content="BooffIn | Research Finds Its People" />
        <meta
          property="og:description"
          content="Connect with researchers globally, share scientific insights, discuss breakthrough papers, and discover research on BooffIn."
        />
        <meta property="og:site_name" content="BooffIn" />
        <meta property="og:image" content="https://www.letsbooffin.com/og-preview.jpg" />
        <meta property="og:image:secure_url" content="https://www.letsbooffin.com/og-preview.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="BooffIn - Research finds its people" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@letsbooffin" />
        <meta name="twitter:creator" content="@letsbooffin" />
        <meta name="twitter:url" content="https://www.letsbooffin.com" />
        <meta name="twitter:title" content="BooffIn | Research Finds Its People" />
        <meta
          name="twitter:description"
          content="Connect with researchers globally, share scientific insights, discuss breakthrough papers, and discover research on BooffIn."
        />
        <meta name="twitter:image" content="https://www.letsbooffin.com/og-preview.jpg" />
        <meta name="twitter:image:alt" content="BooffIn - Research finds its people" />

        {/* PWA Manifest & Icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Standalone Window & PWA Capabilities */}
        <meta name="theme-color" content="#064E3B" />
        <meta name="application-name" content="BooffIn" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BooffIn" />

        {/* JSON-LD Structured Data Schema for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <ScrollViewStyleReset />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('BooffIn PWA ServiceWorker active');
                    },
                    function(err) {
                      console.log('BooffIn SW registration failed', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

