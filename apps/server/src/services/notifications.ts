import fs from 'fs';
import path from 'path';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db';
import {
  children,
  dailyMenus,
  medications,
  notificationUserStates,
  systemNotifications,
  vaccinations,
} from '../db/schema';
import { dataDir } from '../paths';
import { getInventoryOverview } from './stock';
import { hasPermission, type PermissionModule } from './permissions';
import { getInventoryControlEnabled } from './inventoryControl';
import {
  buildBackupNotification,
  buildLowStockNotification,
  buildMedicationNotification,
  buildMenuNotification,
  buildVaccinationNotification,
  type NotificationCandidate,
} from './notificationRules';

interface NotificationViewer {
  id: number;
  role: string;
  permissions?: unknown;
}

export type NotificationScope = 'active' | 'all';

const MANAGED_TYPES = new Set([
  'low_stock',
  'medication_expiry',
  'vaccination',
  'menu_missing',
  'menu_unconfirmed',
  'backup_stale',
]);

const SEVERITY_RANK: Record<string, number> = {
  info: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const latestBackupDate = () => {
  const backupsDir = path.resolve(dataDir, 'backups');
  if (!fs.existsSync(backupsDir)) return null;

  const dates = fs.readdirSync(backupsDir)
    .filter((fileName) => fileName.endsWith('.sqlite.gz'))
    .map((fileName) => fs.statSync(path.join(backupsDir, fileName)).mtime);

  return dates.length > 0
    ? dates.reduce((latest, current) => current > latest ? current : latest)
    : null;
};

const collectCandidates = async (now: Date): Promise<NotificationCandidate[]> => {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const inventoryControlEnabled = await getInventoryControlEnabled();
  const [stock, medicationRows, vaccinationRows, menuRows] = await Promise.all([
    inventoryControlEnabled ? getInventoryOverview() : Promise.resolve([]),
    db.select().from(medications),
    db.select({
      id: vaccinations.id,
      vaccineName: vaccinations.vaccineName,
      planDate: vaccinations.planDate,
      status: vaccinations.status,
      childName: children.fullName,
    })
      .from(vaccinations)
      .innerJoin(children, eq(children.id, vaccinations.childId)),
    db.select({
      id: dailyMenus.id,
      date: dailyMenus.date,
      isConfirmed: dailyMenus.isConfirmed,
    })
      .from(dailyMenus)
      .where(and(gte(dailyMenus.date, today), lte(dailyMenus.date, tomorrowEnd))),
  ]);

  const candidates: NotificationCandidate[] = [];
  stock.forEach((product) => {
    const candidate = buildLowStockNotification(product);
    if (candidate) candidates.push(candidate);
  });
  medicationRows.forEach((medication) => {
    const candidate = buildMedicationNotification({
      ...medication,
      quantity: Number(medication.quantity),
    }, now);
    if (candidate) candidates.push(candidate);
  });
  vaccinationRows.forEach((vaccination) => {
    const candidate = buildVaccinationNotification(vaccination, now);
    if (candidate) candidates.push(candidate);
  });

  const menusByDate = new Map(menuRows.map((menu) => [dateKey(menu.date), menu]));
  const menuDates = [
    { date: today, label: 'сьогодні', severity: 'high' as const },
    { date: tomorrow, label: 'завтра', severity: 'medium' as const },
  ];
  menuDates.forEach(({ date, label, severity }) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return;
    const key = dateKey(date);
    const candidate = buildMenuNotification(
      key,
      label,
      menusByDate.get(key),
      severity,
      inventoryControlEnabled
    );
    if (candidate) candidates.push(candidate);
  });

  const backupCandidate = buildBackupNotification(latestBackupDate(), now);
  if (backupCandidate) candidates.push(backupCandidate);
  return candidates;
};

let refreshPromise: Promise<void> | null = null;

export const refreshSystemNotifications = async (now = new Date()) => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const candidates = await collectCandidates(now);
    const fingerprints = new Set(candidates.map((candidate) => candidate.fingerprint));
    const activeRows = await db.query.systemNotifications.findMany({
      where: isNull(systemNotifications.resolvedAt),
    });

    for (const row of activeRows) {
      if (MANAGED_TYPES.has(row.type) && !fingerprints.has(row.fingerprint)) {
        await db.update(systemNotifications)
          .set({ resolvedAt: now, lastSeenAt: now })
          .where(eq(systemNotifications.id, row.id));
      }
    }

    for (const candidate of candidates) {
      const existing = await db.query.systemNotifications.findFirst({
        where: eq(systemNotifications.fingerprint, candidate.fingerprint),
      });
      const values = {
        type: candidate.type,
        module: candidate.module,
        severity: candidate.severity,
        title: candidate.title,
        message: candidate.message,
        actionPath: candidate.actionPath,
        entityType: candidate.entityType ?? null,
        entityId: candidate.entityId ?? null,
        lastSeenAt: now,
        resolvedAt: null,
      };

      if (existing) {
        await db.update(systemNotifications).set(values).where(eq(systemNotifications.id, existing.id));
        const severityIncreased =
          (SEVERITY_RANK[candidate.severity] ?? 0) > (SEVERITY_RANK[existing.severity] ?? 0);
        if (existing.resolvedAt || severityIncreased) {
          await db.delete(notificationUserStates)
            .where(eq(notificationUserStates.notificationId, existing.id));
        }
      } else {
        await db.insert(systemNotifications).values({
          ...values,
          fingerprint: candidate.fingerprint,
          firstSeenAt: now,
        });
      }
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const canViewModule = (viewer: NotificationViewer, module: string | null) => {
  if (viewer.role === 'admin') return true;
  if (!module) return false;
  if (module === 'inventory') {
    return hasPermission(viewer.role, viewer.permissions, 'inventory', 'view') ||
      hasPermission(viewer.role, viewer.permissions, 'menu', 'view');
  }
  return hasPermission(viewer.role, viewer.permissions, module as PermissionModule, 'view');
};

export const listNotifications = async (viewer: NotificationViewer, scope: NotificationScope = 'active') => {
  await refreshSystemNotifications();
  const now = new Date();
  const rows = await db.select({
    id: systemNotifications.id,
    type: systemNotifications.type,
    module: systemNotifications.module,
    severity: systemNotifications.severity,
    title: systemNotifications.title,
    message: systemNotifications.message,
    actionPath: systemNotifications.actionPath,
    entityType: systemNotifications.entityType,
    entityId: systemNotifications.entityId,
    firstSeenAt: systemNotifications.firstSeenAt,
    lastSeenAt: systemNotifications.lastSeenAt,
    resolvedAt: systemNotifications.resolvedAt,
    readAt: notificationUserStates.readAt,
    snoozedUntil: notificationUserStates.snoozedUntil,
    dismissedAt: notificationUserStates.dismissedAt,
  })
    .from(systemNotifications)
    .leftJoin(notificationUserStates, and(
      eq(notificationUserStates.notificationId, systemNotifications.id),
      eq(notificationUserStates.userId, viewer.id)
    ))
    .orderBy(desc(systemNotifications.lastSeenAt));

  return rows.filter((row) => {
    if (!canViewModule(viewer, row.module)) return false;
    if (scope === 'all') return true;
    if (row.resolvedAt || row.dismissedAt) return false;
    return !row.snoozedUntil || row.snoozedUntil <= now;
  });
};

const ensureAccessibleNotification = async (viewer: NotificationViewer, notificationId: number) => {
  const notification = await db.query.systemNotifications.findFirst({
    where: eq(systemNotifications.id, notificationId),
  });
  if (!notification || !canViewModule(viewer, notification.module)) {
    throw new Error('Сповіщення не знайдено');
  }
};

const upsertUserState = async (
  viewer: NotificationViewer,
  notificationId: number,
  values: { readAt?: Date | null; snoozedUntil?: Date | null; dismissedAt?: Date | null }
) => {
  await ensureAccessibleNotification(viewer, notificationId);
  await db.insert(notificationUserStates).values({
    notificationId,
    userId: viewer.id,
    ...values,
  }).onConflictDoUpdate({
    target: [notificationUserStates.notificationId, notificationUserStates.userId],
    set: values,
  });
};

export const markNotificationRead = (viewer: NotificationViewer, notificationId: number) =>
  upsertUserState(viewer, notificationId, { readAt: new Date() });

export const snoozeNotification = (viewer: NotificationViewer, notificationId: number, until: Date) =>
  upsertUserState(viewer, notificationId, { readAt: new Date(), snoozedUntil: until, dismissedAt: null });

export const dismissNotification = (viewer: NotificationViewer, notificationId: number) =>
  upsertUserState(viewer, notificationId, { readAt: new Date(), snoozedUntil: null, dismissedAt: new Date() });

export const markAllNotificationsRead = async (viewer: NotificationViewer) => {
  const notifications = await listNotifications(viewer, 'active');
  if (notifications.length === 0) return;

  const readAt = new Date();
  await db.insert(notificationUserStates).values(
    notifications.map((notification) => ({
      notificationId: notification.id,
      userId: viewer.id,
      readAt,
    }))
  ).onConflictDoUpdate({
    target: [notificationUserStates.notificationId, notificationUserStates.userId],
    set: { readAt },
  });
};
