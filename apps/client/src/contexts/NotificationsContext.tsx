import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import type { SystemNotification } from '../notifications/types';
import { NotificationsContext } from './notificationsContextValue';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<{ notifications: SystemNotification[] }>('/notifications', {
        params: { scope: 'all' },
      });
      setNotifications(response.data.notifications);
      setCurrentTime(Date.now());
    } catch (error) {
      console.error('Не вдалося завантажити сповіщення', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 60_000);
    const handleChanged = () => void refresh();
    const handleFocus = () => void refresh();
    window.addEventListener('notifications:changed', handleChanged);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('notifications:changed', handleChanged);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh, user]);

  const performAction = useCallback(async (path: string, data?: unknown) => {
    await api.patch(path, data);
    await refresh();
  }, [refresh]);

  const markRead = useCallback((id: number) =>
    performAction(`/notifications/${id}/read`), [performAction]);

  const snooze = useCallback((id: number, hours = 24) =>
    performAction(`/notifications/${id}/snooze`, {
      until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    }), [performAction]);

  const dismiss = useCallback((id: number) =>
    performAction(`/notifications/${id}/dismiss`), [performAction]);

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all');
    await refresh();
  }, [refresh]);

  const activeNotifications = useMemo(() => {
    return notifications.filter((notification) =>
      !notification.resolvedAt &&
      !notification.dismissedAt &&
      (!notification.snoozedUntil || new Date(notification.snoozedUntil).getTime() <= currentTime)
    );
  }, [currentTime, notifications]);

  const unreadCount = activeNotifications.filter((notification) => !notification.readAt).length;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      activeNotifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      snooze,
      dismiss,
      markAllRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};
