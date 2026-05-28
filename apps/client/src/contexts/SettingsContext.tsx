import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

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
  licenseType?: 'lifetime' | 'halfyear' | 'quarterly' | 'monthly' | 'demo' | 'yearly' | string;
  daysRemaining?: number;
  isActivated?: boolean;
  isExpired?: boolean;
}

interface SettingsContextType {
  settings: KindergartenSettings | null;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<KindergartenSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

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
