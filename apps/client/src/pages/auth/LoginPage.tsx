import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { useTranslation } from 'react-i18next';
import { discoverDesktopServers, loadDesktopConfig, normalizeServerUrl, saveDesktopConfig } from '../../api/serverConfig';
import { Eye, EyeOff, Globe, AlertTriangle, KeyRound } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://127.0.0.1:3000');
  const [desktopRole, setDesktopRole] = useState<'server' | 'client'>('server');
  const [isDesktop, setIsDesktop] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState<SadokDiscoveredServer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Клавіатура: Caps Lock та Мова розкладки
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [layoutLang, setLayoutLang] = useState<'ENG' | 'CYR' | 'UNKNOWN'>('UNKNOWN');

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

  // Відстеження розкладки та Caps Lock під час введення
  const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if ('getModifierState' in e && typeof e.getModifierState === 'function') {
      setIsCapsLock(e.getModifierState('CapsLock'));
    }

    if ('key' in e && e.key && e.key.length === 1) {
      if (/[\u0400-\u04FF]/.test(e.key)) {
        setLayoutLang('CYR');
      } else if (/[a-zA-Z]/.test(e.key)) {
        setLayoutLang('ENG');
      }
    }
  };

  const hasCyrillicInput = /[\u0400-\u04FF]/.test(username) || /[\u0400-\u04FF]/.test(password);

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
      const respMsg = err.response?.data?.message || 'Помилка при вході';
      if (err.response?.status === 401) {
        setError(
          `${respMsg}. Будь ласка, перевірте: 1) розкладку клавіатури (має бути ENG); 2) чи не увімкнено Caps Lock; 3) правильність стандартного логіну (admin) та пароля (admin123).`
        );
      } else {
        setError(respMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-warm-100 w-full max-w-md">
        <div className="w-16 h-16 bg-warm-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 mx-auto shadow-lg">S</div>
        <h1 className="text-2xl font-bold mb-1 text-center text-gray-800">{t('app_name')}</h1>
        <p className="text-gray-500 mb-6 text-center text-sm">{t('login_description', 'Будь ласка, увійдіть у систему')}</p>
        
        {/* Індикатор розкладки клавіатури та Caps Lock */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <Globe size={14} className="text-gray-500" />
            <span>Розкладка:</span>
            {hasCyrillicInput || layoutLang === 'CYR' ? (
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                Кирилиця (УКР) ⚠️
              </span>
            ) : layoutLang === 'ENG' ? (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                English (ENG) ✓
              </span>
            ) : (
              <span className="bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-md">
                ENG / УКР
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isCapsLock ? (
              <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-300 animate-pulse">
                ⇪ Caps Lock увімкнено
              </span>
            ) : (
              <span className="text-gray-400 text-[11px]">Caps Lock вимкнено</span>
            )}
          </div>
        </div>

        {/* Попередження про кирилицю */}
        {(hasCyrillicInput || layoutLang === 'CYR') && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl mb-4 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Увага! Ви вводите текст кирилицею</div>
              <div className="text-amber-800 mt-0.5">
                Стандартні логін <strong>admin</strong> та пароль <strong>admin123</strong> складаються з англійських (латинських) літер. Будь ласка, переключіть клавіатуру на <strong>ENG</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Попередження про Caps Lock */}
        {isCapsLock && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Увага:</strong> увімкнено Caps Lock! Паролі чутливі до регістру символів.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-red-600" />
              <span>Помилка авторизації</span>
            </div>
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isDesktop && desktopRole === 'client' && (
            <div className="space-y-2">
              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1 ml-1" htmlFor="serverUrl">
                  Адреса головного комп'ютера
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
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-gray-600 text-xs font-semibold" htmlFor="username">
                Логін
              </label>
            </div>
            <input
              id="username"
              type="text"
              className="ui-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyActivity}
              onKeyUp={handleKeyActivity}
              onFocus={handleKeyActivity}
              autoComplete="username"
              maxLength={64}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-gray-600 text-xs font-semibold" htmlFor="password">
                Пароль
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="ui-input pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyActivity}
                onKeyUp={handleKeyActivity}
                onFocus={handleKeyActivity}
                autoComplete="current-password"
                maxLength={128}
                placeholder="admin123"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-gray-400 transition hover:text-warm-600 focus:outline-none focus:ring-4 focus:ring-warm-100"
                onClick={() => setShowPassword((isVisible) => !isVisible)}
                aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                title={showPassword ? 'Приховати пароль' : 'Показати пароль'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="ui-button-primary w-full py-3 shadow-md"
            disabled={loading}
          >
            {loading ? 'Вхід...' : t('login')}
          </button>
        </form>

        {/* Підказка для першого входу */}
        <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 font-semibold mb-1">
            <KeyRound size={14} className="text-warm-600" />
            <span>Дані за замовчуванням для першого входу:</span>
          </div>
          <p className="text-xs text-gray-500 font-mono bg-white inline-block px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
            Логін: <strong className="text-gray-800">admin</strong> | Пароль: <strong className="text-gray-800">admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
