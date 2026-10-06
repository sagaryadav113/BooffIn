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
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
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
        <link rel="canonical" href="https://letsbooffin.com" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://letsbooffin.com" />
        <meta property="og:title" content="BooffIn | Research Finds Its People" />
        <meta
          property="og:description"
          content="Connect with researchers, share scientific insights, and explore the future of science on BooffIn."
        />
        <meta property="og:site_name" content="BooffIn" />
        <meta property="og:image" content="https://letsbooffin.com/icon-512.png" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://letsbooffin.com" />
        <meta name="twitter:title" content="BooffIn | Research Finds Its People" />
        <meta
          name="twitter:description"
          content="Connect with researchers, share scientific insights, and explore the future of science on BooffIn."
        />
        <meta name="twitter:image" content="https://letsbooffin.com/icon-512.png" />

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

