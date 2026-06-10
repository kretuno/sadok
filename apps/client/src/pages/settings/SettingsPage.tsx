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
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">{t('settings')}</h2>
        <p className="mt-2 text-gray-500">{t('settings_description')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Navigation Sidebar/Top Wrap */}
        <div className="flex flex-row flex-wrap md:flex-col gap-2 w-full md:w-64 flex-shrink-0 bg-warm-50/40 p-2.5 rounded-3xl border border-warm-100/60">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-200 rounded-2xl flex-grow md:flex-grow-0 justify-center md:justify-start ${
              activeTab === 'theme'
                ? 'bg-warm-600 text-white shadow-md shadow-warm-200 scale-[1.02]'
                : 'text-gray-600 hover:bg-warm-100/60 hover:text-gray-800'
            }`}
          >
            <Palette size={18} className="flex-shrink-0" />
            <span className="truncate">{t('settings_tab_theme')}</span>
          </button>

          <button
            onClick={() => setActiveTab('kindergarten')}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-200 rounded-2xl flex-grow md:flex-grow-0 justify-center md:justify-start ${
              activeTab === 'kindergarten'
                ? 'bg-warm-600 text-white shadow-md shadow-warm-200 scale-[1.02]'
                : 'text-gray-600 hover:bg-warm-100/60 hover:text-gray-800'
            }`}
          >
            <Building2 size={18} className="flex-shrink-0" />
            <span className="truncate">{t('settings_tab_kindergarten')}</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-200 rounded-2xl flex-grow md:flex-grow-0 justify-center md:justify-start ${
                activeTab === 'users'
                  ? 'bg-warm-600 text-white shadow-md shadow-warm-200 scale-[1.02]'
                  : 'text-gray-600 hover:bg-warm-100/60 hover:text-gray-800'
              }`}
            >
              <Users size={18} className="flex-shrink-0" />
              <span className="truncate">{t('settings_tab_users')}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-200 rounded-2xl flex-grow md:flex-grow-0 justify-center md:justify-start ${
              activeTab === 'backup'
                ? 'bg-warm-600 text-white shadow-md shadow-warm-200 scale-[1.02]'
                : 'text-gray-600 hover:bg-warm-100/60 hover:text-gray-800'
            }`}
          >
            <Database size={18} className="flex-shrink-0" />
            <span className="truncate">{t('settings_tab_backup')}</span>
          </button>

          <button
            onClick={() => setActiveTab('license')}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-200 rounded-2xl flex-grow md:flex-grow-0 justify-center md:justify-start ${
              activeTab === 'license'
                ? 'bg-warm-600 text-white shadow-md shadow-warm-200 scale-[1.02]'
                : 'text-gray-600 hover:bg-warm-100/60 hover:text-gray-800'
            }`}
          >
            <Key size={18} className="flex-shrink-0" />
            <span className="truncate">{t('settings_tab_license')}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          <Suspense fallback={<SettingsTabFallback />}>
            {activeTab === 'theme' && <ThemeSettingsTab />}
            {activeTab === 'kindergarten' && <KindergartenSettingsTab />}
            {activeTab === 'users' && <UsersSettingsTab />}
            {activeTab === 'backup' && <BackupSettingsTab />}
            {activeTab === 'license' && <LicenseSettingsTab />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
