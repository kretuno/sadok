const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const dgram = require('dgram');
const os = require('os');
const { spawn } = require('child_process');

// Вимикаємо автоматичне завантаження оновлень (Сценарій А)
autoUpdater.autoDownload = false;

// Обмеження використання оперативної пам'яті (RAM) для процесів Electron
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');

let mainWindow;
let serverProcess;
let discoverySocket;
const isDev = !app.isPackaged;
const devClientUrl = 'http://127.0.0.1:5173';
const defaultServerUrl = 'http://127.0.0.1:3000';
const discoveryPort = 30303;
const discoveryRequest = 'SADOK_DISCOVER_V1';
const discoveryResponseType = 'SADOK_SERVER_V1';

function getConfigPath() {
  return path.join(app.getPath('userData'), 'desktop-config.json');
}

function normalizeServerUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return defaultServerUrl;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

function readDesktopConfig() {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return { role: 'server', serverUrl: defaultServerUrl };
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const role = parsed.role === 'client' ? 'client' : 'server';
    const serverUrl = role === 'server'
      ? defaultServerUrl
      : normalizeServerUrl(parsed.serverUrl || '');

    return { role, serverUrl };
  } catch (error) {
    console.error('[Electron] Failed to read desktop config:', error);
    return { role: 'server', serverUrl: defaultServerUrl };
  }
}

function writeDesktopConfig(nextConfig) {
  const role = nextConfig.role === 'client' ? 'client' : 'server';
  const serverUrl = role === 'server'
    ? defaultServerUrl
    : normalizeServerUrl(nextConfig.serverUrl || '');
  const config = { role, serverUrl };
  const configPath = getConfigPath();

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

function getLocalIpv4Addresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

function getBroadcastAddresses() {
  const addresses = new Set(['255.255.255.255']);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const item of interfaces || []) {
      if (!item || item.family !== 'IPv4' || item.internal || !item.netmask) {
        continue;
      }

      const ipParts = item.address.split('.').map(Number);
      const maskParts = item.netmask.split('.').map(Number);

      if (ipParts.length !== 4 || maskParts.length !== 4) {
        continue;
      }

      const broadcast = ipParts
        .map((part, index) => (part | (~maskParts[index] & 255)) & 255)
        .join('.');
      addresses.add(broadcast);
    }
  }

  return Array.from(addresses);
}

function startDiscoveryResponder() {
  const config = readDesktopConfig();

  if (config.role !== 'server' || discoverySocket) {
    return;
  }

  discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  discoverySocket.on('message', (message, rinfo) => {
    if (message.toString('utf8') !== discoveryRequest) {
      return;
    }

    const payload = Buffer.from(JSON.stringify({
      type: discoveryResponseType,
      name: os.hostname(),
      port: 3000,
      addresses: getLocalIpv4Addresses(),
    }));

    discoverySocket.send(payload, rinfo.port, rinfo.address);
  });

  discoverySocket.on('error', (error) => {
    console.error('[Discovery] Responder error:', error);
  });

  discoverySocket.bind(discoveryPort, '0.0.0.0', () => {
    discoverySocket.setBroadcast(true);
    console.log(`[Discovery] Server responder listening on UDP ${discoveryPort}`);
  });
}

function discoverServers(timeoutMs = 2500) {
  return new Promise((resolve) => {
    const results = new Map();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const timer = setTimeout(() => {
      socket.close();
      resolve(Array.from(results.values()));
    }, timeoutMs);

    socket.on('message', (message, rinfo) => {
      try {
        const payload = JSON.parse(message.toString('utf8'));

        if (payload.type !== discoveryResponseType) {
          return;
        }

        const url = normalizeServerUrl(`${rinfo.address}:${payload.port || 3000}`);
        results.set(url, {
          name: payload.name || rinfo.address,
          address: rinfo.address,
          port: payload.port || 3000,
          url,
        });
      } catch (error) {
        console.error('[Discovery] Invalid response:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('[Discovery] Client error:', error);
      clearTimeout(timer);
      socket.close();
      resolve(Array.from(results.values()));
    });

    socket.bind(0, '0.0.0.0', () => {
      socket.setBroadcast(true);
      const request = Buffer.from(discoveryRequest);

      for (const broadcastAddress of getBroadcastAddresses()) {
        socket.send(request, discoveryPort, broadcastAddress);
      }
    });
  });
}

function getServerEntryPath() {
  const candidates = [
    path.join(process.resourcesPath || __dirname, 'server', 'dist', 'index.js'),
    path.join(__dirname, 'apps', 'server', 'dist', 'index.js'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function registerIpcHandlers() {
  ipcMain.handle('sadok:get-config', () => readDesktopConfig());
  ipcMain.handle('sadok:set-config', (_event, config) => {
    const nextConfig = writeDesktopConfig(config || {});
    
    if (nextConfig.role === 'server') {
      if (!serverProcess) {
        console.log('[Electron] Role changed to server. Starting local server...');
        startServer();
      }
      if (!discoverySocket) {
        console.log('[Electron] Role changed to server. Starting discovery responder...');
        startDiscoveryResponder();
      }
    } else if (nextConfig.role === 'client') {
      if (serverProcess) {
        console.log('[Electron] Role changed to client. Stopping local server...');
        serverProcess.kill();
        serverProcess = null;
      }
      if (discoverySocket) {
        console.log('[Electron] Role changed to client. Stopping discovery responder...');
        discoverySocket.close();
        discoverySocket = null;
      }
    }
    
    return nextConfig;
  });
  ipcMain.handle('sadok:discover-servers', () => discoverServers());

  // Автооновлення IPC
  ipcMain.handle('sadok:check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      console.error('[Update] Check error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sadok:download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[Update] Download error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sadok:install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

function startServer() {
  const config = readDesktopConfig();

  if (config.role !== 'server') {
    console.log('[Electron] Client installation selected. Local server will not be started.');
    return;
  }

  if (isDev) {
    console.log('[Electron] Running in development mode. Server is expected to be started externally via concurrently.');
    return;
  }
  
  console.log('[Electron] Starting production server...');
  const serverPath = getServerEntryPath();
  const serverCwd = process.resourcesPath || __dirname;
  const jwtSecret = process.env.JWT_SECRET || 'sadok-default-local-jwt-secret-key-2026';
  
  serverProcess = spawn(process.execPath, ['--max-old-space-size=128', serverPath], {
    cwd: serverCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3000',
      JWT_SECRET: jwtSecret,
      SADOK_DATA_DIR: path.join(app.getPath('userData'), 'server-data'),
    },
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server]: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data}`);
  });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: "SADOK - Система управління дитячим садком",
    icon: path.join(__dirname, 'build/icon.ico')
  });

  const startUrl = isDev
    ? devClientUrl
    : `file://${path.join(__dirname, 'apps/client/dist/index.html')}`;

  console.log(`[Electron] Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { serverUrl } = readDesktopConfig();

    if (url.startsWith(defaultServerUrl) || url.startsWith(serverUrl)) {
      return { action: 'allow' };
    }

    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const { serverUrl } = readDesktopConfig();
    const allowedUrls = [startUrl, devClientUrl, defaultServerUrl, serverUrl];
    const isAllowed = allowedUrls.some((allowedUrl) => url.startsWith(allowedUrl));

    if (!isAllowed) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev) {
      console.log('[Electron] Failed to load dev server. Retrying in 2 seconds...');
      setTimeout(() => {
        mainWindow.loadURL(startUrl);
      }, 2000);
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Update] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Update] Update available:', info.version);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sadok:update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Update] Update not available.');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sadok:update-not-available');
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Update] Error:', err);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sadok:update-error', err.message || String(err));
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sadok:download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Update] Update downloaded.');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sadok:update-downloaded');
    }
  });
}

app.on('ready', () => {
  setupAutoUpdater();
  registerIpcHandlers();
  startServer();
  startDiscoveryResponder();
  createWindow();

  // Запуск фонової перевірки оновлень вимкнено для уникнення 404 помилок на приватному/нествореному репозиторії
  /*
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[Update] Initial check error:', err);
      });
    }, 5000);
  }
  */
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (serverProcess) {
    serverProcess.kill();
  }
  if (discoverySocket) {
    discoverySocket.close();
    discoverySocket = null;
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
