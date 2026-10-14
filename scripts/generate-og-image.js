const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generateOGImage() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (!fs.existsSync(edgePath)) {
    console.error('Edge executable not found at:', edgePath);
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1200px;
          height: 630px;
          background: linear-gradient(135deg, #022C22 0%, #064E3B 55%, #047857 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 70px 85px;
          position: relative;
          overflow: hidden;
        }
        /* Background decorative circles & pattern */
        .bg-glow-1 {
          position: absolute;
          width: 550px;
          height: 550px;
          top: -150px;
          right: -100px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .bg-glow-2 {
          position: absolute;
          width: 450px;
          height: 450px;
          bottom: -150px;
          left: -100px;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, rgba(6, 78, 59, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .header-row {
          display: flex;
          align-items: center;
          gap: 20px;
          z-index: 2;
        }
        .logo-box {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Georgia", serif;
          font-size: 46px;
          font-weight: 800;
          color: #064E3B;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: -0.8px;
          color: #FFFFFF;
          line-height: 1.1;
        }
        .brand-url {
          font-size: 18px;
          color: #A7F3D0;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .content {
          z-index: 2;
          margin-top: 25px;
        }
        .hero-title {
          font-size: 56px;
          font-weight: 850;
          letter-spacing: -1.2px;
          line-height: 1.15;
          color: #FFFFFF;
          margin-bottom: 18px;
        }
        .hero-title span {
          color: #6EE7B7;
        }
        .hero-subtitle {
          font-size: 23px;
          line-height: 1.45;
          color: #E2E8F0;
          max-width: 880px;
          font-weight: 400;
        }
        .footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
          padding-top: 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }
        .tags {
          display: flex;
          gap: 12px;
        }
        .tag {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 8px 18px;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 600;
          color: #F1F5F9;
        }
        .domain-pill {
          background: #047857;
          border: 1px solid #10B981;
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 700;
          padding: 9px 22px;
          border-radius: 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="bg-glow-1"></div>
      <div class="bg-glow-2"></div>
      
      <div class="header-row">
        <div class="logo-box">B</div>
        <div class="brand-text">
          <div class="brand-name">BooffIn</div>
          <div class="brand-url">letsbooffin.com</div>
        </div>
      </div>

      <div class="content">
        <div class="hero-title">
          Where research finds <span>its people</span>.
        </div>
        <div class="hero-subtitle">
          Connect with researchers globally, discuss breakthrough papers, share scientific insights, and accelerate discovery.
        </div>
      </div>

      <div class="footer-row">
        <div class="tags">
          <div class="tag">🔬 Scholarly Network</div>
          <div class="tag">📄 Research Discussions</div>
          <div class="tag">⚡ Real-time Discovery</div>
        </div>
        <div class="domain-pill">www.letsbooffin.com</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const publicJpg = path.join(__dirname, '..', 'public', 'og-preview.jpg');
  const distJpg = path.join(__dirname, '..', 'dist', 'og-preview.jpg');
  const publicPng = path.join(__dirname, '..', 'public', 'og-preview.png');
  const distPng = path.join(__dirname, '..', 'dist', 'og-preview.png');

  await page.screenshot({
    path: publicJpg,
    type: 'jpeg',
    quality: 88,
  });
  console.log('Saved JPEG to', publicJpg);

  await page.screenshot({
    path: publicPng,
    type: 'png',
  });
  console.log('Saved PNG to', publicPng);

  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    fs.copyFileSync(publicJpg, distJpg);
    fs.copyFileSync(publicPng, distPng);
    console.log('Copied to dist/');
  }

  await browser.close();
  console.log('OG image generation complete!');
}

generateOGImage().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
