import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  snoozeNotification,
} from '../services/notifications';

const viewerFrom = (req: AuthRequest) => {
  if (!req.user) throw new Error('Authentication required');
  return req.user;
};

const notificationIdFrom = (req: AuthRequest) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Некоректне сповіщення');
  return id;
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'active';
    const notifications = await listNotifications(viewerFrom(req), scope);
    res.json({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt && !notification.resolvedAt).length,
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Помилка завантаження сповіщень' });
  }
};

export const readNotification = async (req: AuthRequest, res: Response) => {
  try {
    await markNotificationRead(viewerFrom(req), notificationIdFrom(req));
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ message: error instanceof Error ? error.message : 'Сповіщення не знайдено' });
  }
};

export const snoozeNotificationHandler = async (req: AuthRequest, res: Response) => {
  try {
    const until = new Date(req.body.until);
    if (Number.isNaN(until.getTime()) || until <= new Date()) {
      return res.status(400).json({ message: 'Вкажіть майбутній час відкладення' });
    }
    await snoozeNotification(viewerFrom(req), notificationIdFrom(req), until);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ message: error instanceof Error ? error.message : 'Сповіщення не знайдено' });
  }
};

export const dismissNotificationHandler = async (req: AuthRequest, res: Response) => {
  try {
    await dismissNotification(viewerFrom(req), notificationIdFrom(req));
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ message: error instanceof Error ? error.message : 'Сповіщення не знайдено' });
  }
};

export const readAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    await markAllNotificationsRead(viewerFrom(req));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Помилка оновлення сповіщень' });
  }
};
