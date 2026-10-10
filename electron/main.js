// BooffIn Electron Main Process
const { app, BrowserWindow, session, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Allow self-signed certificates or academic endpoints if needed
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/images/icon.png');

  mainWindow = new BrowserWindow({
    title: 'BooffIn',
    width: 1366,
    height: 880,
    minWidth: 1024,
    minHeight: 650,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Keep web security, but strip blocking headers below
      allowRunningInsecureContent: false,
    },
    backgroundColor: '#0F172A',
    show: false,
  });

  // Standard modern desktop browser user-agent
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 BooffInDesktop/1.0.0';
  mainWindow.webContents.setUserAgent(userAgent);

  // Unblock academic paper iframes by stripping restrictive headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Remove anti-embedding headers so bioRxiv, arXiv, PMC, and other journals can render inside BooffIn
    const headersToRemove = [
      'x-frame-options',
      'X-Frame-Options',
      'content-security-policy',
      'Content-Security-Policy',
      'frame-ancestors',
      'Frame-Ancestors',
    ];

    for (const h of headersToRemove) {
      delete responseHeaders[h];
    }

    // Ensure permissive CORS for document requests
    responseHeaders['access-control-allow-origin'] = ['*'];

    callback({ cancel: false, responseHeaders });
  });

  // Load the exported production Expo web bundle or local dev server
  const distIndexPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    // Fallback to local dev server if dist not yet built
    mainWindow.loadURL('http://localhost:8081');
  }

  // Gracefully show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links (open in system default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's an external authentication or general web link, open in user's default browser
    if (url.startsWith('https://accounts.google.com') || url.startsWith('https://github.com/login')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Allow internal window creation for PDF previews
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
