const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const svgPath = path.resolve(__dirname, '../booffin logo.svg');
const content = fs.readFileSync(svgPath, 'utf8');

const fills = new Set(content.match(/fill="[^"]+"/g) || []);
console.log('Unique fills count:', fills.size);
console.log('Sample fills:', Array.from(fills).slice(0, 20));

const svgTagMatch = content.match(/<svg[^>]*>/);
console.log('SVG tag:', svgTagMatch ? svgTagMatch[0] : 'None');

// Find all transforms
const transforms = content.match(/transform="translate\([^)]+\)"/g);
console.log('Total transforms:', transforms ? transforms.length : 0);
if (transforms) {
  console.log('Sample transforms:', transforms.slice(0, 10));
}


const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

async function renderPreview() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });

  // Add viewBox if missing
  let svgCode = content;
  if (!svgCode.includes('viewBox')) {
    svgCode = svgCode.replace('<svg ', '<svg viewBox="0 0 4096 4096" ');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 1024px; height: 1024px; overflow: hidden; background: #333; }
    svg { width: 1024px; height: 1024px; display: block; }
  </style>
</head>
<body>
  ${svgCode}
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const bbox = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    return {
      svgW: svg ? svg.clientWidth : 0,
      svgH: svg ? svg.clientHeight : 0,
      pathCount: document.querySelectorAll('path').length
    };
  });
  console.log('DOM info:', bbox);

  const scratchDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const previewPath = path.join(scratchDir, 'preview-logo.png');
  await page.screenshot({ path: previewPath, omitBackground: false });
  console.log('Saved preview to:', previewPath);
  await browser.close();
}

renderPreview().catch(console.error);


