import React, { useState, useEffect } from 'react';
import { loadDesktopConfig, type DesktopConfig } from '../api/serverConfig';
import api from '../api/axios';
import ServerDiscoveryScreen from '../pages/setup/ServerDiscoveryScreen';

interface NetworkBootstrapProps {
  children: React.ReactNode;
}

const NetworkBootstrap: React.FC<NetworkBootstrapProps> = ({ children }) => {
  const [config, setConfig] = useState<DesktopConfig | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isServerOffline, setIsServerOffline] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const desktopConfig = await loadDesktopConfig();
        setConfig(desktopConfig);

        // Якщо це серверний комп'ютер, або ми працюємо в браузері,
        // просто пропускаємо цей крок
        if (desktopConfig.role === 'server' && !window.sadokDesktop) {
          setIsChecking(false);
          return;
        }

        // Перевіряємо, чи доступний сервер
        try {
          // api/axios використовує getApiBaseUrl, який бере serverUrl зі сховища (записане в loadDesktopConfig)
          await api.get('/health', { timeout: 3000 });
          setIsServerOffline(false);
        } catch (error) {
          console.warn('Сервер недоступний:', error);
          if (desktopConfig.role === 'client') {
            setIsServerOffline(true);
          }
        }
      } catch (err) {
        console.error('Не вдалося завантажити конфігурацію:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkNetwork();
  }, []);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Перевірка підключення...</p>
        </div>
      </div>
    );
  }

  // Показуємо екран пошуку тільки якщо роль клієнт і сервер недоступний
  if (config?.role === 'client' && isServerOffline) {
    return (
      <ServerDiscoveryScreen 
        onConnected={() => window.location.reload()} 
      />
    );
  }

  return <>{children}</>;
};

export default NetworkBootstrap;
