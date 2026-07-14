import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { severityLabels, type NotificationSeverity } from '../../notifications/types';

const severityDot: Record<NotificationSeverity, string> = {
  critical: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  info: 'bg-blue-500',
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { activeNotifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [open]);

  const openNotification = async (id: number, actionPath: string) => {
    await markRead(id);
    setOpen(false);
    navigate(actionPath);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-warm-100 bg-white text-gray-600 shadow-sm transition hover:bg-warm-50 hover:text-warm-600"
        aria-label={`Сповіщення: ${unreadCount} непрочитаних`}
        title="Сповіщення"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="font-bold text-gray-800">Сповіщення</div>
              <div className="text-xs text-gray-500">{unreadCount} непрочитаних</div>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-semibold text-warm-600 hover:text-warm-700">
                <CheckCheck size={15} /> Прочитати всі
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {activeNotifications.slice(0, 5).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification.id, notification.actionPath)}
                className="flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50"
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[notification.severity]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-gray-800">{notification.title}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">{notification.message}</span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-gray-400">
                    <Clock3 size={11} /> {severityLabels[notification.severity]}
                  </span>
                </span>
                <ChevronRight size={16} className="mt-1 shrink-0 text-gray-300" />
              </button>
            ))}
            {activeNotifications.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-gray-500">Активних сповіщень немає</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="w-full px-4 py-3 text-center text-sm font-bold text-warm-600 transition hover:bg-warm-50"
          >
            Відкрити центр сповіщень
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
