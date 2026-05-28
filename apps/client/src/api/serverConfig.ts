export type DesktopRole = 'server' | 'client';

export interface DesktopConfig {
  role: DesktopRole;
  serverUrl: string;
}

const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000';
const STORAGE_KEY = 'sadok.serverUrl';

export const normalizeServerUrl = (value: string | null | undefined): string => {
  const raw = String(value || '').trim();

  if (!raw) {
    return DEFAULT_SERVER_URL;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withProtocol.replace(/\/+$/, '');
};

export const getStoredServerUrl = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_SERVER_URL;
  }

  return normalizeServerUrl(window.localStorage.getItem(STORAGE_KEY));
};

export const setStoredServerUrl = (value: string): string => {
  const serverUrl = normalizeServerUrl(value);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, serverUrl);
  }

  return serverUrl;
};

export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '/api';
  }

  if (window.location.protocol === 'file:') {
    return `${getStoredServerUrl()}/api`;
  }

  return '/api';
};

export const getSocketBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_SERVER_URL;
  }

  if (window.location.protocol === 'file:') {
    return getStoredServerUrl();
  }

  return window.location.origin;
};

export const loadDesktopConfig = async (): Promise<DesktopConfig> => {
  const desktopConfig = await window.sadokDesktop?.getConfig?.();
  const config = desktopConfig || { role: 'server', serverUrl: DEFAULT_SERVER_URL };
  const serverUrl = setStoredServerUrl(config.serverUrl || DEFAULT_SERVER_URL);

  return {
    role: config.role === 'client' ? 'client' : 'server',
    serverUrl,
  };
};

export const saveDesktopConfig = async (config: DesktopConfig): Promise<DesktopConfig> => {
  const serverUrl = setStoredServerUrl(config.serverUrl);
  const nextConfig = { ...config, serverUrl };

  if (window.sadokDesktop?.setConfig) {
    return window.sadokDesktop.setConfig(nextConfig);
  }

  return nextConfig;
};

export const discoverDesktopServers = async (): Promise<SadokDiscoveredServer[]> => {
  if (!window.sadokDesktop?.discoverServers) {
    return [];
  }

  return window.sadokDesktop.discoverServers();
};
