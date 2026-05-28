import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Building2, Users, Database, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ThemeSettingsTab = lazy(() => import('./tabs/ThemeSettingsTab'));
const KindergartenSettingsTab = lazy(() => import('./tabs/KindergartenSettingsTab'));
const UsersSettingsTab = lazy(() => import('./tabs/UsersSettingsTab'));
const BackupSettingsTab = lazy(() => import('./tabs/BackupSettingsTab'));
const LicenseSettingsTab = lazy(() => import('./tabs/LicenseSettingsTab'));

const SettingsTabFallback: React.FC = () => (
  <div className="rounded-2xl border border-warm-100 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
    Завантаження налаштувань...
  </div>
);

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'theme' | 'kindergarten' | 'users' | 'backup' | 'license'>('theme');

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">{t('settings')}</h2>
        <p className="mt-2 text-gray-500">{t('settings_description')}</p>
      </div>

      <div className="flex gap-4 overflow-x-auto border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-6 py-4 text-sm font-bold transition-colors ${
            activeTab === 'theme'
              ? 'rounded-t-xl border-warm-500 bg-warm-50/50 text-warm-600'
              : 'rounded-t-xl border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Palette size={18} /> {t('settings_tab_theme')}
        </button>

        <button
          onClick={() => setActiveTab('kindergarten')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-6 py-4 text-sm font-bold transition-colors ${
            activeTab === 'kindergarten'
              ? 'rounded-t-xl border-warm-500 bg-warm-50/50 text-warm-600'
              : 'rounded-t-xl border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Building2 size={18} /> {t('settings_tab_kindergarten')}
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'users'
                ? 'rounded-t-xl border-warm-500 bg-warm-50/50 text-warm-600'
                : 'rounded-t-xl border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Users size={18} /> {t('settings_tab_users')}
          </button>
        )}

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-6 py-4 text-sm font-bold transition-colors ${
            activeTab === 'backup'
              ? 'rounded-t-xl border-warm-500 bg-warm-50/50 text-warm-600'
              : 'rounded-t-xl border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Database size={18} /> {t('settings_tab_backup')}
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-6 py-4 text-sm font-bold transition-colors ${
            activeTab === 'license'
              ? 'rounded-t-xl border-warm-500 bg-warm-50/50 text-warm-600'
              : 'rounded-t-xl border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Key size={18} /> {t('settings_tab_license')}
        </button>
      </div>

      <div className="mt-6">
        <Suspense fallback={<SettingsTabFallback />}>
          {activeTab === 'theme' && <ThemeSettingsTab />}
          {activeTab === 'kindergarten' && <KindergartenSettingsTab />}
          {activeTab === 'users' && <UsersSettingsTab />}
          {activeTab === 'backup' && <BackupSettingsTab />}
          {activeTab === 'license' && <LicenseSettingsTab />}
        </Suspense>
      </div>
    </div>
  );
};

export default SettingsPage;
