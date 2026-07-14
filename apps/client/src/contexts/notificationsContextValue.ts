import { createContext } from 'react';
import type { SystemNotification } from '../notifications/types';

export interface NotificationsContextValue {
  notifications: SystemNotification[];
  activeNotifications: SystemNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  snooze: (id: number, hours?: number) => Promise<void>;
  dismiss: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);
