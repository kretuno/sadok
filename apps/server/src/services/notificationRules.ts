import type { PermissionModule } from './permissions';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface NotificationCandidate {
  fingerprint: string;
  type: string;
  module: PermissionModule | null;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionPath: string;
  entityType?: string;
  entityId?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (date: Date, now: Date) =>
  Math.ceil((date.getTime() - now.getTime()) / DAY_MS);

export const buildLowStockNotification = (product: {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minStock: number;
}): NotificationCandidate | null => {
  if (product.minStock <= 0 || product.stockQuantity > product.minStock) return null;

  return {
    fingerprint: `inventory:low-stock:${product.id}`,
    type: 'low_stock',
    module: 'inventory',
    severity: product.stockQuantity <= 0 ? 'critical' : 'high',
    title: product.stockQuantity <= 0 ? `Закінчився продукт: ${product.name}` : `Низький залишок: ${product.name}`,
    message: `Залишок ${product.stockQuantity} ${product.unit}, мінімальний рівень ${product.minStock} ${product.unit}.`,
    actionPath: '/inventory',
    entityType: 'product',
    entityId: product.id,
  };
};

export const buildMenuNotification = (
  dateKey: string,
  label: string,
  menu: { id: number; isConfirmed: boolean | null } | undefined,
  severity: NotificationSeverity,
  inventoryControlEnabled = true
): NotificationCandidate | null => {
  if (menu?.isConfirmed) return null;

  return {
    fingerprint: `menu:${menu ? 'unconfirmed' : 'missing'}:${dateKey}`,
    type: menu ? 'menu_unconfirmed' : 'menu_missing',
    module: 'menu',
    severity,
    title: menu ? `Меню на ${label} не підтверджено` : `Немає меню на ${label}`,
    message: menu
      ? inventoryControlEnabled
        ? 'Перевірте розрахунок і підтвердьте меню для списання продуктів.'
        : 'Перевірте розрахунок і підтвердьте меню на цей день.'
      : inventoryControlEnabled
        ? 'Створіть меню, щоб кухня та склад мали актуальний план.'
        : 'Створіть меню, щоб кухня мала актуальний план на день.',
    actionPath: '/menu',
    entityType: 'menu',
    entityId: menu?.id,
  };
};

export const buildMedicationNotification = (
  medication: { id: number; name: string; expiryDate: Date | null; quantity: number; unit: string },
  now: Date
): NotificationCandidate | null => {
  if (!medication.expiryDate || medication.quantity <= 0) return null;
  const remainingDays = daysUntil(medication.expiryDate, now);
  if (remainingDays > 30) return null;

  const expired = remainingDays < 0;
  return {
    fingerprint: `medical:medication-expiry:${medication.id}`,
    type: 'medication_expiry',
    module: 'medical',
    severity: expired ? 'critical' : remainingDays <= 7 ? 'high' : 'medium',
    title: expired ? `Прострочено: ${medication.name}` : `Закінчується термін: ${medication.name}`,
    message: expired
      ? `Термін придатності минув ${Math.abs(remainingDays)} дн. тому. Залишок: ${medication.quantity} ${medication.unit}.`
      : `До завершення терміну придатності ${remainingDays} дн. Залишок: ${medication.quantity} ${medication.unit}.`,
    actionPath: '/medical',
    entityType: 'medication',
    entityId: medication.id,
  };
};

export const buildVaccinationNotification = (
  vaccination: { id: number; vaccineName: string; childName: string; planDate: Date | null; status: string },
  now: Date
): NotificationCandidate | null => {
  if (vaccination.status !== 'planned' || !vaccination.planDate) return null;
  const remainingDays = daysUntil(vaccination.planDate, now);
  if (remainingDays > 7) return null;

  const overdue = remainingDays < 0;
  return {
    fingerprint: `medical:vaccination:${vaccination.id}`,
    type: 'vaccination',
    module: 'medical',
    severity: overdue ? 'critical' : remainingDays <= 1 ? 'high' : 'medium',
    title: overdue ? `Прострочено щеплення: ${vaccination.vaccineName}` : `Заплановано щеплення: ${vaccination.vaccineName}`,
    message: overdue
      ? `${vaccination.childName}: планова дата минула ${Math.abs(remainingDays)} дн. тому.`
      : `${vaccination.childName}: до планової дати ${remainingDays} дн.`,
    actionPath: '/medical',
    entityType: 'vaccination',
    entityId: vaccination.id,
  };
};

export const buildBackupNotification = (lastBackupAt: Date | null, now: Date): NotificationCandidate | null => {
  const ageDays = lastBackupAt ? Math.floor((now.getTime() - lastBackupAt.getTime()) / DAY_MS) : null;
  if (ageDays !== null && ageDays < 2) return null;

  return {
    fingerprint: 'system:backup-stale',
    type: 'backup_stale',
    module: null,
    severity: ageDays === null || ageDays >= 7 ? 'critical' : 'high',
    title: ageDays === null ? 'Немає резервної копії' : 'Резервна копія застаріла',
    message: ageDays === null
      ? 'У системі ще не створено жодної резервної копії.'
      : `Останню резервну копію створено ${ageDays} дн. тому.`,
    actionPath: '/settings',
    entityType: 'backup',
  };
};
