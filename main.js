const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const dgram = require('dgram');
const os = require('os');
const { spawn } = require('child_process');

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
  ipcMain.handle('sadok:set-config', (_event, config) => writeDesktopConfig(config || {}));
  ipcMain.handle('sadok:discover-servers', () => discoverServers());
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
  
  serverProcess = spawn(process.execPath, ['--max-old-space-size=128', serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3000',
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

app.on('ready', () => {
  registerIpcHandlers();
  startServer();
  startDiscoveryResponder();
  createWindow();
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
