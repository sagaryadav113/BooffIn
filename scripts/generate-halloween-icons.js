const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const svgSourcePath = path.resolve(__dirname, '../booffin logo.svg');
let rawSvg = fs.readFileSync(svgSourcePath, 'utf8');

// Ensure viewBox
if (!rawSvg.includes('viewBox')) {
  rawSvg = rawSvg.replace('<svg ', '<svg viewBox="0 0 4096 4096" ');
}

// Transparent version removes outer background path
const transparentSvg = rawSvg.replace(/<path d="M0 0 C1351\.68 0[^>]+fill="#FDFEFD"[^>]*\/>/, '');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

function getHtml(svgContent, canvasSize, contentSize, bgColor) {
  const bgStyle = bgColor === 'transparent' ? 'background: transparent;' : `background: ${bgColor};`;
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html {
      width: ${canvasSize}px;
      height: ${canvasSize}px;
      overflow: hidden;
      ${bgStyle}
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .wrapper {
      width: ${contentSize}px;
      height: ${contentSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${svgContent}
  </div>
</body>
</html>`;
}

async function generateAll() {
  console.log('Launching browser for icon rendering...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  async function renderIcon(outputPath, canvasSize, contentSize, bgColor, isTransparentSvg = false) {
    await page.setViewport({ width: canvasSize, height: canvasSize, deviceScaleFactor: 1 });
    const svgToUse = isTransparentSvg ? transparentSvg : rawSvg;
    const html = getHtml(svgToUse, canvasSize, contentSize, bgColor);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Wait a brief tick for SVG rasterization
    await new Promise(r => setTimeout(r, 100));

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await page.screenshot({
      path: outputPath,
      omitBackground: bgColor === 'transparent'
    });
    console.log(`Rendered: ${outputPath} (${canvasSize}x${canvasSize})`);
  }

  // 1. App Icon (1024x1024, white background, content 820px so corners aren't clipped by iOS squircle)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/icon.png'),
    1024,
    820,
    '#FFFFFF',
    true
  );

  // 2. Android Adaptive Foreground (1024x1024, transparent, safe zone 680px)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/android-icon-foreground.png'),
    1024,
    680,
    'transparent',
    true
  );

  // 3. Android Adaptive Background (1024x1024, pure white)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/android-icon-background.png'),
    1024,
    1024,
    '#FFFFFF',
    false
  );

  // 4. Android Monochrome (1024x1024, transparent, 680px)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/android-icon-monochrome.png'),
    1024,
    680,
    'transparent',
    true
  );

  // 5. Splash Icon (512x512, transparent, 380px)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/splash-icon.png'),
    512,
    380,
    'transparent',
    true
  );

  // 6. Favicon in assets (192x192, white background, 160px)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/favicon.png'),
    192,
    160,
    '#FFFFFF',
    true
  );

  // 7. Booffin Symbol (512x512, white bg, 460px)
  await renderIcon(
    path.resolve(__dirname, '../assets/images/booffin-symbol.png'),
    512,
    460,
    '#FFFFFF',
    true
  );

  // 8. Public web icons
  await renderIcon(
    path.resolve(__dirname, '../public/favicon.png'),
    192,
    160,
    '#FFFFFF',
    true
  );

  await renderIcon(
    path.resolve(__dirname, '../public/icon-192.png'),
    192,
    160,
    '#FFFFFF',
    true
  );

  await renderIcon(
    path.resolve(__dirname, '../public/icon-512.png'),
    512,
    460,
    '#FFFFFF',
    true
  );

  await renderIcon(
    path.resolve(__dirname, '../public/apple-touch-icon.png'),
    180,
    150,
    '#FFFFFF',
    true
  );

  await renderIcon(
    path.resolve(__dirname, '../public/apple-touch-icon-precomposed.png'),
    180,
    150,
    '#FFFFFF',
    true
  );

  await browser.close();
  console.log('All icons generated successfully!');

  // Copy SVG to assets
  fs.copyFileSync(svgSourcePath, path.resolve(__dirname, '../assets/images/booffin-halloween-symbol.svg'));
  console.log('Saved SVG copy to assets/images/booffin-halloween-symbol.svg');
}

generateAll().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
