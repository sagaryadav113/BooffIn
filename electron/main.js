// BooffIn Electron Main Process
const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Register custom privileged scheme for SPA asset loading
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// Allow unblocked academic endpoints
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
      webSecurity: false, // Allows cross-origin paper embedding inside desktop
      allowRunningInsecureContent: false,
    },
    backgroundColor: '#0F172A',
    show: false,
  });

  // Standard modern desktop browser user-agent
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 BooffInDesktop/1.0.0';
  mainWindow.webContents.setUserAgent(userAgent);

  // Unblock academic paper iframes by stripping anti-embedding headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

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

    responseHeaders['access-control-allow-origin'] = ['*'];

    callback({ cancel: false, responseHeaders });
  });

  // Load the app via privileged scheme at root route
  mainWindow.loadURL('app://localhost/').catch(() => {
    // Fallback: direct load file
    const distIndexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(distIndexPath);
  });

  // Show window once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://accounts.google.com') || url.startsWith('https://github.com/login')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Resolve dist path
  const distPath = path.join(__dirname, '../dist');

  // Handle app:// protocol for SPA assets
  protocol.handle('app', (request) => {
    const reqUrl = new URL(request.url);
    let pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(distPath, pathname);

    // If file doesn't exist, serve index.html (SPA client-side routing)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distPath, 'index.html');
    }

    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`);
  });

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
