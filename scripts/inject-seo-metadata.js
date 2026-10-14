const fs = require('fs');
const path = require('path');

const distHtmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distHtmlPath)) {
  console.warn('[inject-seo-metadata] dist/index.html not found, skipping injection.');
  process.exit(0);
}

// 1. Ensure preview images are in dist
const filesToSync = ['og-preview.jpg', 'og-preview.png', 'icon-512.png', 'icon-192.png', 'favicon.png', 'manifest.json', 'robots.txt', 'sitemap.xml'];
for (const file of filesToSync) {
  const src = path.join(publicDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log(`[inject-seo-metadata] Copied ${file} to dist/`);
  }
}

// 2. Read dist/index.html
let html = fs.readFileSync(distHtmlPath, 'utf8');

// 3. Build rich OpenGraph, Twitter, and SEO tags
const metaTags = `
    <!-- Canonical & Base SEO -->
    <link rel="canonical" href="https://www.letsbooffin.com" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="keywords" content="BooffIn, letsbooffin, scientific research, academic collaboration, researcher network, biology, AI in science, neuroscience, research papers, scientific discovery" />
    <meta name="author" content="BooffIn Inc." />

    <!-- Open Graph / WhatsApp / Facebook / LinkedIn / Telegram -->
    <meta property="og:site_name" content="BooffIn" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.letsbooffin.com" />
    <meta property="og:title" content="BooffIn | Research Finds Its People" />
    <meta property="og:description" content="Connect with researchers globally, share scientific insights, discuss breakthrough papers, and discover research on BooffIn." />
    <meta property="og:image" content="https://www.letsbooffin.com/og-preview.jpg" />
    <meta property="og:image:secure_url" content="https://www.letsbooffin.com/og-preview.jpg" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="BooffIn - Research finds its people" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@letsbooffin" />
    <meta name="twitter:creator" content="@letsbooffin" />
    <meta name="twitter:url" content="https://www.letsbooffin.com" />
    <meta name="twitter:title" content="BooffIn | Research Finds Its People" />
    <meta name="twitter:description" content="Connect with researchers globally, share scientific insights, discuss breakthrough papers, and discover research on BooffIn." />
    <meta name="twitter:image" content="https://www.letsbooffin.com/og-preview.jpg" />
    <meta name="twitter:image:alt" content="BooffIn - Research finds its people" />

    <!-- Icons & Manifest -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

    <!-- Structured Data (JSON-LD) for Search Engines -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.letsbooffin.com/#organization",
          "name": "BooffIn",
          "url": "https://www.letsbooffin.com",
          "logo": "https://www.letsbooffin.com/icon-512.png",
          "description": "A global academic platform where research finds its people — connecting academics, student researchers, and science enthusiasts.",
          "sameAs": [
            "https://twitter.com/letsbooffin"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://www.letsbooffin.com/#website",
          "url": "https://www.letsbooffin.com",
          "name": "BooffIn",
          "publisher": { "@id": "https://www.letsbooffin.com/#organization" },
          "description": "Where scientific research finds its people. Connect with researchers and explore breakthroughs."
        }
      ]
    }
    </script>
`;

// Replace <title>BooffIn</title> with rich title
html = html.replace(
  /<title>.*?<\/title>/i,
  '<title>BooffIn | Research Finds Its People — Scientific Collaboration Platform</title>'
);

// Inject before </head>
if (html.includes('</head>')) {
  // Avoid duplicate injection if already present
  if (!html.includes('property="og:image"')) {
    html = html.replace('</head>', `${metaTags}\n</head>`);
    fs.writeFileSync(distHtmlPath, html, 'utf8');
    console.log('[inject-seo-metadata] Successfully injected OpenGraph, Twitter, and SEO metadata into dist/index.html');
  } else {
    console.log('[inject-seo-metadata] dist/index.html already has OG tags, updating them.');
    // Replace old OG block
    html = html.replace(/<!-- Canonical & Base SEO -->[\s\S]*?<\/script>/i, metaTags.trim());
    fs.writeFileSync(distHtmlPath, html, 'utf8');
  }
} else {
  console.warn('[inject-seo-metadata] Could not find </head> in dist/index.html');
}
