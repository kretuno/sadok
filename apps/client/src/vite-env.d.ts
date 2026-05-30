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

interface SadokUpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface SadokDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

interface Window {
  sadokDesktop?: {
    platform: string;
    getConfig?: () => Promise<SadokDesktopConfig>;
    setConfig?: (config: SadokDesktopConfig) => Promise<SadokDesktopConfig>;
    discoverServers?: () => Promise<SadokDiscoveredServer[]>;
    
    checkForUpdates?: () => Promise<{ success: boolean; error?: string }>;
    downloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
    installUpdate?: () => void;
    
    onUpdateAvailable?: (callback: (info: SadokUpdateInfo) => void) => () => void;
    onUpdateNotAvailable?: (callback: () => void) => () => void;
    onDownloadProgress?: (callback: (progress: SadokDownloadProgress) => void) => () => void;
    onUpdateDownloaded?: (callback: () => void) => () => void;
    onUpdateError?: (callback: (err: string) => void) => () => void;
  };
}

