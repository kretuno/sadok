import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import {
  getLicenseRefreshIntervalMs,
  shouldRefreshSettingsAfterLicenseSync,
} from '../utils/licenseRefresh';

export interface KindergartenSettings {
  id: number;
  name: string;
  edrpou: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  nurseName: string;
  storekeeperName: string;
  supplyManagerName: string;
  showQuotes: boolean;
  inventoryControlEnabled: boolean;
  licenseType?: 'lifetime' | 'halfyear' | 'quarterly' | 'monthly' | 'demo' | 'yearly' | string;
  daysRemaining?: number;
  isActivated?: boolean;
  isExpired?: boolean;
  backupTime?: string;
  maxBackupsCount?: number;
  lastBackupDate?: string | null;
  appVersion?: string;
}

interface SettingsContextType {
  settings: KindergartenSettings | null;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [settings, setSettings] = useState<KindergartenSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let disposed = false;
    let requestInProgress = false;
    const synchronizeLicense = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const response = await api.post('/settings/activation-status');
        if (!disposed && shouldRefreshSettingsAfterLicenseSync(response.data)) {
          await refreshSettings();
        }
      } catch {
        // Тимчасова недоступність Активатора не повинна блокувати локальну роботу.
      } finally {
        requestInProgress = false;
      }
    };

    void synchronizeLicense();
    const timer = window.setInterval(
      () => void synchronizeLicense(),
      getLicenseRefreshIntervalMs(Boolean(settings?.isActivated)),
    );
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, refreshSettings, settings?.isActivated]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
