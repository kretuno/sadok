import React from 'react';
import {
  Baby,
  BookOpen,
  Briefcase,
  FileText,
  HeartPulse,
  Info,
  LayoutGrid,
  LogOut,
  Package,
  Gauge,
  Settings,
  Users,
  Brain,
  CalendarCheck,
  Bell,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { PermissionModule } from '../../security/permissions';

const Sidebar: React.FC = () => {
  const { logout, can } = useAuth();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const isExpired = settings?.isExpired === true;

  const allMenuItems: Array<{ name: string; icon: React.ReactNode; path: string; module?: PermissionModule }> = [
    { name: t('dashboard'), icon: <LayoutGrid size={20} />, path: '/' },
    { name: t('inventory'), icon: <Package size={20} />, path: '/inventory', module: 'inventory' },
    { name: t('children'), icon: <Baby size={20} />, path: '/children', module: 'children' },
    { name: t('attendance', 'Відвідування'), icon: <CalendarCheck size={20} />, path: '/attendance', module: 'attendance' },
    { name: t('menu'), icon: <BookOpen size={20} />, path: '/menu', module: 'menu' },
    { name: t('employees'), icon: <Users size={20} />, path: '/employees', module: 'employees' },
    { name: t('property'), icon: <Briefcase size={20} />, path: '/property', module: 'property' },
    { name: t('medical'), icon: <HeartPulse size={20} />, path: '/medical', module: 'medical' },
    { name: t('psychologist'), icon: <Brain size={20} />, path: '/psychologist', module: 'psychologist' },
    { name: t('utilities'), icon: <Gauge size={20} />, path: '/utilities', module: 'utilities' },
    { name: t('reports'), icon: <FileText size={20} />, path: '/reports', module: 'reports' },
    { name: 'Сповіщення', icon: <Bell size={20} />, path: '/notifications' },
    { name: t('settings'), icon: <Settings size={20} />, path: '/settings' },
  ];
  const menuItems = allMenuItems.filter((item) => !item.module || can(item.module, 'view'));

  return (
    <aside className="z-10 flex h-screen w-60 shrink-0 flex-col border-r bg-white p-4 shadow-sm xl:w-64 print:hidden">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-500 font-bold text-white">S</div>
        <span className="truncate font-bold text-xl text-warm-600">SADOK</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isDisabled = isExpired && item.path !== '/settings';
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
              className={({ isActive }) =>
                `flex w-full min-w-0 items-center gap-3 rounded-lg p-3 transition ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed pointer-events-none'
                    : isActive
                    ? 'bg-warm-100 font-semibold text-warm-600'
                    : 'text-gray-600 hover:bg-warm-50 hover:text-warm-600'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/about"
          onClick={(e) => {
            if (isExpired) {
              e.preventDefault();
            }
          }}
          className={({ isActive }) =>
            `flex w-full min-w-0 items-center gap-3 rounded-lg p-3 transition ${
              isExpired
                ? 'opacity-40 cursor-not-allowed pointer-events-none'
                : isActive
                ? 'bg-warm-100 font-semibold text-warm-600'
                : 'text-gray-600 hover:bg-warm-50 hover:text-warm-600'
            }`
          }
        >
          <Info size={20} className="shrink-0" />
          <span className="truncate">{t('about')}</span>
        </NavLink>
      </nav>

      <div className="mt-4 border-t pt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 text-xs text-gray-400">
          <span>Версія</span>
          <span className="font-medium bg-warm-50 px-2 py-0.5 rounded-full text-warm-600 border border-warm-100">
            v{settings?.appVersion || '1.1.0'}
          </span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-lg p-3 text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="truncate">{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
