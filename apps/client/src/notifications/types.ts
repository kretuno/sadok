export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface SystemNotification {
  id: number;
  type: string;
  module: string | null;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionPath: string;
  entityType: string | null;
  entityId: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  readAt: string | null;
  snoozedUntil: string | null;
  dismissedAt: string | null;
}

export const severityLabels: Record<NotificationSeverity, string> = {
  critical: 'Критичне',
  high: 'Високий пріоритет',
  medium: 'Середній пріоритет',
  info: 'Інформація',
};

export const moduleLabels: Record<string, string> = {
  inventory: 'Склад',
  menu: 'Меню',
  medical: 'Медицина',
  system: 'Система',
};
