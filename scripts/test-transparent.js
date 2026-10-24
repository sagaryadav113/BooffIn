const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const svgPath = path.resolve(__dirname, '../booffin logo.svg');
let svgCode = fs.readFileSync(svgPath, 'utf8');

// Ensure viewBox
if (!svgCode.includes('viewBox')) {
  svgCode = svgCode.replace('<svg ', '<svg viewBox="0 0 4096 4096" ');
}

// Transparent version: remove the first background path
const transparentSvg = svgCode.replace(/<path d="M0 0 C1351\.68 0[^>]+fill="#FDFEFD"[^>]*\/>/, '');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

async function testTransparent() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 1024px; height: 1024px; overflow: hidden; background: transparent; }
    svg { width: 1024px; height: 1024px; display: block; }
  </style>
</head>
<body>
  ${transparentSvg}
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const previewPath = path.resolve(__dirname, '../scratch/preview-transparent.png');
  await page.screenshot({ path: previewPath, omitBackground: true });
  console.log('Saved transparent preview to:', previewPath);
  await browser.close();
}

testTransparent().catch(console.error);
