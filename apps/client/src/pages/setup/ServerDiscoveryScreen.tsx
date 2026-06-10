import React, { useState, useEffect } from 'react';
import { Search, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { saveDesktopConfig } from '../../api/serverConfig';

interface DiscoveredServer {
  name: string;
  address: string;
  port: number;
  url: string;
}

interface ServerDiscoveryScreenProps {
  onConnected: () => void;
}

const ServerDiscoveryScreen: React.FC<ServerDiscoveryScreenProps> = ({ onConnected }) => {
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<DiscoveredServer | null>(null);

  const scanNetwork = async () => {
    if (!window.sadokDesktop?.discoverServers) return;

    setIsScanning(true);
    setError(null);
    setSelectedServer(null);
    setServers([]);

    try {
      const discovered = await window.sadokDesktop.discoverServers();
      setServers(discovered || []);
      if (discovered && discovered.length === 0) {
        setError("Головний комп'ютер не знайдено в локальній мережі.");
      }
    } catch (err) {
      console.error('Помилка пошуку:', err);
      setError('Виникла помилка під час пошуку сервера.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scanNetwork();
  }, []);

  const handleConnect = async () => {
    if (!selectedServer) return;

    try {
      await saveDesktopConfig({
        role: 'client',
        serverUrl: selectedServer.url,
      });
      // Allow some time for config to settle, then reload or call callback
      setTimeout(() => {
        onConnected();
      }, 500);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('Не вдалося зберегти налаштування.');
    }
  };

  const handleSetAsServer = async () => {
    try {
      await saveDesktopConfig({
        role: 'server',
        serverUrl: 'http://127.0.0.1:3000',
      });
      setTimeout(() => {
        onConnected();
      }, 500);
    } catch (err) {
      console.error('Failed to set config as server:', err);
      setError('Не вдалося зберегти налаштування.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Server size={32} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Пошук Головного Комп'ютера</h1>
          <p className="text-gray-500">
            Ваш комп'ютер налаштовано як "Клієнт". Для роботи необхідно підключитися до головного сервера SADOK у вашій локальній мережі.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start rounded-lg bg-red-50 p-4 text-red-800">
            <AlertCircle className="mr-3 mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mb-8 min-h-[160px]">
          {isScanning ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
              <RefreshCw className="mb-3 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-gray-600">Сканування мережі...</p>
            </div>
          ) : servers.length > 0 ? (
            <div className="space-y-3">
              {servers.map((server) => (
                <button
                  key={server.url}
                  onClick={() => setSelectedServer(server)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
                    selectedServer?.url === server.url
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-semibold text-gray-900">{server.name}</span>
                    <span className="text-sm text-gray-500">{server.url}</span>
                  </div>
                  {selectedServer?.url === server.url && (
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
              <Search className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">Серверів не знайдено</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConnect}
            disabled={!selectedServer || isScanning}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Підключитися
          </button>
          <button
            onClick={scanNetwork}
            disabled={isScanning}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Сканувати знову
          </button>
          <button
            onClick={handleSetAsServer}
            disabled={isScanning}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Зробити цей комп'ютер Головним (Сервером)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerDiscoveryScreen;
