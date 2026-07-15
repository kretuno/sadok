import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { productBatches, stockMovements } from '../src/db/schema';
import {
  deductProductStock,
  getOutstandingMenuStockDeductions,
  restoreMenuStockDeductions,
} from '../src/services/stock';

const createStockDatabase = () => {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_price REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      category TEXT,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE product_batches (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      arrival_date INTEGER NOT NULL,
      initial_quantity REAL NOT NULL,
      remaining_quantity REAL NOT NULL,
      price_per_unit REAL NOT NULL,
      invoice_id INTEGER,
      invoice_item_id INTEGER,
      expiry_date INTEGER
    );
    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER,
      invoice_id INTEGER,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      price_at_moment REAL NOT NULL,
      date INTEGER,
      reason TEXT,
      user_id INTEGER,
      menu_id INTEGER,
      reversal_of_movement_id INTEGER
    );
    CREATE TABLE product_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      price REAL NOT NULL,
      change_date INTEGER,
      reason TEXT NOT NULL,
      reference_id INTEGER
    );
    INSERT INTO products (id, name, unit, current_price) VALUES (1, 'Крупа', 'кг', 25);
    INSERT INTO product_batches (
      id, product_id, arrival_date, initial_quantity, remaining_quantity, price_per_unit
    ) VALUES (1, 1, 0, 20, 20, 25);
  `);
  return { sqlite, database: drizzle(sqlite, { schema }) };
};

test('menu stock deductions roll back atomically after a later failure', () => {
  const { sqlite, database } = createStockDatabase();

  assert.throws(() => database.transaction((tx) => {
    deductProductStock(tx, { productId: 1, quantity: 2, reason: 'Меню', menuId: 10 });
    deductProductStock(tx, { productId: 1, quantity: 100, reason: 'Меню', menuId: 10 });
  }), /Недостатньо залишку/);

  const batch = database.query.productBatches.findFirst({
    where: eq(productBatches.id, 1),
  }).sync();
  const movements = database.select().from(stockMovements).all();
  assert.equal(Number(batch?.remainingQuantity), 20);
  assert.equal(movements.length, 0);
  sqlite.close();
});

test('menu cancellation restores exact unreversed deductions once', () => {
  const { sqlite, database } = createStockDatabase();

  database.transaction((tx) => {
    deductProductStock(tx, { productId: 1, quantity: 3.5, reason: 'Меню', menuId: 10 });
  });
  database.transaction((tx) => {
    const deductions = getOutstandingMenuStockDeductions(tx, 10, 'Меню');
    assert.equal(deductions.length, 1);
    restoreMenuStockDeductions(tx, deductions, {
      menuId: 10,
      reason: 'Скасування меню',
    });
  });

  const batch = database.query.productBatches.findFirst({
    where: eq(productBatches.id, 1),
  }).sync();
  const remainingDeductions = database.transaction((tx) =>
    getOutstandingMenuStockDeductions(tx, 10, 'Меню')
  );
  const reversal = database.query.stockMovements.findFirst({
    where: eq(stockMovements.type, 'in'),
  }).sync();

  assert.equal(Number(batch?.remainingQuantity), 20);
  assert.equal(remainingDeductions.length, 0);
  assert.equal(reversal?.reversalOfMovementId, 1);
  sqlite.close();
});
