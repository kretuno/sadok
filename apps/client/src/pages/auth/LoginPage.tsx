import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { useTranslation } from 'react-i18next';
import { discoverDesktopServers, loadDesktopConfig, normalizeServerUrl, saveDesktopConfig } from '../../api/serverConfig';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('http://127.0.0.1:3000');
  const [desktopRole, setDesktopRole] = useState<'server' | 'client'>('server');
  const [isDesktop, setIsDesktop] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState<SadokDiscoveredServer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!window.sadokDesktop) {
      return () => {
        isMounted = false;
      };
    }

    setIsDesktop(true);
    void loadDesktopConfig().then((config) => {
      if (!isMounted) {
        return;
      }

      setDesktopRole(config.role);
      setServerUrl(config.serverUrl);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDiscoverServers = async () => {
    setDiscovering(true);
    setError('');

    try {
      const servers = await discoverDesktopServers();
      setDiscoveredServers(servers);

      if (servers.length === 1) {
        setServerUrl(servers[0].url);
      }

      if (servers.length === 0) {
        setError('Сервер SADOK у мережі не знайдено. Перевірте, що програма запущена на головному компʼютері та брандмауер дозволяє мережевий доступ.');
      }
    } catch {
      setError('Не вдалося виконати пошук сервера у мережі.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isDesktop) {
        await saveDesktopConfig({
          role: desktopRole,
          serverUrl: normalizeServerUrl(serverUrl),
        });
      }

      const response = await api.post('/auth/login', { username, password });
      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка при вході');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-warm-100 w-full max-w-sm">
        <div className="w-16 h-16 bg-warm-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 mx-auto shadow-lg">S</div>
        <h1 className="text-2xl font-bold mb-1 text-center text-gray-800">{t('app_name')}</h1>
        <p className="text-gray-500 mb-8 text-center text-sm">{t('login_description', 'Будь ласка, увійдіть у систему')}</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isDesktop && desktopRole === 'client' && (
            <div className="space-y-2">
              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1 ml-1" htmlFor="serverUrl">
                  Адрес головного комп'ютера
                </label>
                <input
                  id="serverUrl"
                  type="text"
                  className="ui-input"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="192.168.1.10:3000"
                  required
                />
              </div>

              <button
                type="button"
                className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm font-bold text-warm-700 transition hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDiscoverServers}
                disabled={discovering}
              >
                {discovering ? 'Пошук сервера...' : 'Знайти сервер у мережі'}
              </button>

              {discoveredServers.length > 0 && (
                <div className="space-y-1">
                  {discoveredServers.map((server) => (
                    <button
                      key={server.url}
                      type="button"
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                        normalizeServerUrl(serverUrl) === server.url
                          ? 'border-warm-400 bg-warm-100 text-warm-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-warm-300'
                      }`}
                      onClick={() => setServerUrl(server.url)}
                    >
                      <span className="block font-bold">{server.name}</span>
                      <span>{server.url}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-gray-600 text-xs font-semibold mb-1 ml-1" htmlFor="username">
              Логін
            </label>
            <input
              id="username"
              type="text"
              className="ui-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-semibold mb-1 ml-1" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="ui-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="ui-button-primary w-full py-3"
            disabled={loading}
          >
            {loading ? 'Вхід...' : t('login')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
