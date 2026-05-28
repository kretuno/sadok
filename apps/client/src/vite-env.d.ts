/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface SadokDesktopConfig {
  role: 'server' | 'client';
  serverUrl: string;
}

interface SadokDiscoveredServer {
  name: string;
  address: string;
  port: number;
  url: string;
}

interface Window {
  sadokDesktop?: {
    platform: string;
    getConfig?: () => Promise<SadokDesktopConfig>;
    setConfig?: (config: SadokDesktopConfig) => Promise<SadokDesktopConfig>;
    discoverServers?: () => Promise<SadokDiscoveredServer[]>;
  };
}
