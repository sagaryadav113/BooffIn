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

    // Do NOT alter headers for Supabase API or auth calls
    if (details.url.includes('supabase.co') || details.url.includes('lvstuqhrmagzqkgwlisl')) {
      callback({ cancel: false, responseHeaders });
      return;
    }

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

  // Handle in-app OAuth popup window so Google/ORCID login stays inside the desktop app
  function openOAuthPopup(authUrl) {
    const authWindow = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      width: 520,
      height: 700,
      title: 'Sign In to BooffIn',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    authWindow.loadURL(authUrl);

    const checkCallback = (targetUrl) => {
      if (!targetUrl) return;
      if (
        targetUrl.includes('/auth/callback') ||
        targetUrl.includes('access_token=') ||
        targetUrl.includes('code=') ||
        targetUrl.startsWith('booffin://')
      ) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-callback', targetUrl);
        }
        setTimeout(() => {
          if (!authWindow.isDestroyed()) {
            authWindow.close();
          }
        }, 300);
      }
    };

    authWindow.webContents.on('will-navigate', (event, url) => {
      checkCallback(url);
    });

    authWindow.webContents.on('will-redirect', (event, url) => {
      checkCallback(url);
    });
  }

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

  // Prevent external navigation and capture OAuth in the in-app popup
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (
      navigationUrl.includes('accounts.google.com') ||
      navigationUrl.includes('supabase.co/auth/v1/authorize') ||
      navigationUrl.includes('orcid.org/oauth')
    ) {
      event.preventDefault();
      openOAuthPopup(navigationUrl);
      return;
    }
    if (!navigationUrl.startsWith('app://localhost')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Handle external links and OAuth popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('supabase.co/auth/v1/authorize') ||
      url.includes('orcid.org/oauth')
    ) {
      openOAuthPopup(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
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
