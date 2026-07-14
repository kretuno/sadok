import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBackupNotification,
  buildLowStockNotification,
  buildMedicationNotification,
  buildMenuNotification,
  buildVaccinationNotification,
} from '../src/services/notificationRules';

const now = new Date('2026-07-14T09:00:00.000Z');

test('low stock notifications ignore products without configured minimums', () => {
  assert.equal(buildLowStockNotification({
    id: 1,
    name: 'Молоко',
    unit: 'кг',
    stockQuantity: 0,
    minStock: 0,
  }), null);

  const notification = buildLowStockNotification({
    id: 2,
    name: 'Крупа',
    unit: 'кг',
    stockQuantity: 0,
    minStock: 5,
  });
  assert.equal(notification?.severity, 'critical');
  assert.equal(notification?.fingerprint, 'inventory:low-stock:2');
});

test('medication expiry severity increases as the date approaches', () => {
  const soon = buildMedicationNotification({
    id: 1,
    name: 'Препарат',
    expiryDate: new Date('2026-07-18T09:00:00.000Z'),
    quantity: 2,
    unit: 'уп.',
  }, now);
  const expired = buildMedicationNotification({
    id: 1,
    name: 'Препарат',
    expiryDate: new Date('2026-07-10T09:00:00.000Z'),
    quantity: 2,
    unit: 'уп.',
  }, now);

  assert.equal(soon?.severity, 'high');
  assert.equal(expired?.severity, 'critical');
});

test('only planned vaccinations inside the warning window create notifications', () => {
  assert.equal(buildVaccinationNotification({
    id: 1,
    vaccineName: 'КПК',
    childName: 'Тестова дитина',
    planDate: new Date('2026-07-16T09:00:00.000Z'),
    status: 'done',
  }, now), null);

  const planned = buildVaccinationNotification({
    id: 2,
    vaccineName: 'КПК',
    childName: 'Тестова дитина',
    planDate: new Date('2026-07-15T09:00:00.000Z'),
    status: 'planned',
  }, now);
  assert.equal(planned?.severity, 'high');
});

test('menu rules distinguish missing and unconfirmed menus', () => {
  assert.equal(buildMenuNotification('2026-07-14', 'сьогодні', {
    id: 1,
    isConfirmed: true,
  }, 'high'), null);
  assert.equal(
    buildMenuNotification('2026-07-14', 'сьогодні', undefined, 'high')?.type,
    'menu_missing'
  );
  assert.equal(
    buildMenuNotification('2026-07-14', 'сьогодні', { id: 1, isConfirmed: false }, 'high')?.type,
    'menu_unconfirmed'
  );
});

test('backup warning starts after two days and escalates after a week', () => {
  assert.equal(buildBackupNotification(new Date('2026-07-13T09:00:00.000Z'), now), null);
  assert.equal(buildBackupNotification(new Date('2026-07-11T09:00:00.000Z'), now)?.severity, 'high');
  assert.equal(buildBackupNotification(null, now)?.severity, 'critical');
});
