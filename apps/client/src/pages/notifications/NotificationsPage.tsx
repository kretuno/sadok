import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../../components/ui/CustomSelect';
import { useNotifications } from '../../hooks/useNotifications';
import {
  moduleLabels,
  severityLabels,
  type NotificationSeverity,
  type SystemNotification,
} from '../../notifications/types';

type StatusFilter = 'active' | 'snoozed' | 'closed';

const severityStyle: Record<NotificationSeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

const isSnoozed = (notification: SystemNotification, currentTime: number) =>
  Boolean(notification.snoozedUntil && new Date(notification.snoozedUntil).getTime() > currentTime);

const statusOf = (notification: SystemNotification, currentTime: number): StatusFilter => {
  if (notification.resolvedAt || notification.dismissedAt) return 'closed';
  if (isSnoozed(notification, currentTime)) return 'snoozed';
  return 'active';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    snooze,
    dismiss,
    markAllRead,
  } = useNotifications();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const counts = useMemo(() => ({
    active: notifications.filter((item) => statusOf(item, currentTime) === 'active').length,
    snoozed: notifications.filter((item) => statusOf(item, currentTime) === 'snoozed').length,
    closed: notifications.filter((item) => statusOf(item, currentTime) === 'closed').length,
  }), [currentTime, notifications]);

  const filteredNotifications = useMemo(() => notifications.filter((notification) =>
    statusOf(notification, currentTime) === statusFilter &&
    (severityFilter === 'all' || notification.severity === severityFilter) &&
    (moduleFilter === 'all' || (notification.module || 'system') === moduleFilter)
  ), [currentTime, moduleFilter, notifications, severityFilter, statusFilter]);

  const availableModules = useMemo(() => Array.from(new Set(
    notifications.map((notification) => notification.module || 'system')
  )), [notifications]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
    } catch {
      setNotice('Не вдалося оновити сповіщення');
    }
  };

  const openTarget = async (notification: SystemNotification) => {
    if (!notification.readAt) await markRead(notification.id);
    navigate(notification.actionPath);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-warm-500">Контроль подій</p>
          <h2 className="text-3xl font-bold text-gray-800">Центр сповіщень</h2>
          <p className="mt-2 text-gray-500">Проблеми складу, меню, медицини та резервного копіювання в одному місці.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="ui-button-secondary px-4 py-2"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Оновити
          </button>
          <button
            type="button"
            onClick={() => void runAction(markAllRead, 'Усі активні сповіщення прочитано')}
            disabled={unreadCount === 0}
            className="ui-button-primary px-4 py-2"
          >
            <CheckCheck size={17} /> Прочитати всі
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
          <AlertCircle size={17} className="text-warm-500" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-3 border-y border-warm-100 bg-white">
        {([
          { id: 'active' as const, label: 'Активні', count: counts.active },
          { id: 'snoozed' as const, label: 'Відкладені', count: counts.snoozed },
          { id: 'closed' as const, label: 'Завершені', count: counts.closed },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatusFilter(item.id)}
            className={`border-b-2 px-3 py-4 text-sm font-bold transition ${
              statusFilter === item.id
                ? 'border-warm-500 bg-warm-50 text-warm-700'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            {item.label} <span className="ml-1 text-xs opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CustomSelect
          options={[
            { id: 'all', name: 'Усі пріоритети' },
            ...Object.entries(severityLabels).map(([id, name]) => ({ id, name })),
          ]}
          value={severityFilter}
          onChange={(value) => setSeverityFilter(String(value))}
        />
        <CustomSelect
          options={[
            { id: 'all', name: 'Усі розділи' },
            ...availableModules.map((id) => ({ id, name: moduleLabels[id] || id })),
          ]}
          value={moduleFilter}
          onChange={(value) => setModuleFilter(String(value))}
        />
      </div>

      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <article
            key={notification.id}
            className={`grid gap-4 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center ${
              notification.readAt ? 'border-gray-200' : 'border-warm-300'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${severityStyle[notification.severity]}`}>
              <Bell size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-800">{notification.title}</h3>
                {!notification.readAt && <span className="h-2 w-2 rounded-full bg-warm-500" title="Непрочитане" />}
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${severityStyle[notification.severity]}`}>
                  {severityLabels[notification.severity]}
                </span>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                  {moduleLabels[notification.module || 'system'] || notification.module}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600">{notification.message}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <Clock3 size={13} /> Оновлено {formatDateTime(notification.lastSeenAt)}
                {notification.snoozedUntil && isSnoozed(notification, currentTime) && (
                  <span> · відкладено до {formatDateTime(notification.snoozedUntil)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {statusFilter === 'active' && (
                <>
                  {!notification.readAt && (
                    <button
                      type="button"
                      onClick={() => void runAction(() => markRead(notification.id), 'Сповіщення прочитано')}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      title="Позначити прочитаним"
                      aria-label="Позначити прочитаним"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runAction(() => snooze(notification.id), 'Сповіщення відкладено на 24 години')}
                    className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                    title="Відкласти на 24 години"
                    aria-label="Відкласти на 24 години"
                  >
                    <Clock3 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void runAction(() => dismiss(notification.id), 'Сповіщення завершено')}
                    className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                    title="Завершити"
                    aria-label="Завершити"
                  >
                    <CheckCheck size={18} />
                  </button>
                </>
              )}
              {!notification.resolvedAt && !notification.dismissedAt && (
                <button
                  type="button"
                  onClick={() => void openTarget(notification)}
                  className="ui-button-secondary px-3 py-2 text-sm"
                >
                  Перейти <ChevronRight size={16} />
                </button>
              )}
            </div>
          </article>
        ))}

        {filteredNotifications.length === 0 && !loading && (
          <div className="flex min-h-56 flex-col items-center justify-center border-y border-warm-100 bg-white px-6 text-center">
            <Inbox size={34} className="text-warm-300" />
            <h3 className="mt-3 font-bold text-gray-700">У цьому списку немає сповіщень</h3>
            <p className="mt-1 text-sm text-gray-500">Змініть фільтри або перевірте інший статус.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
