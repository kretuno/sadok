import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import {
  runSchemaMigrations,
  type SchemaMigration,
} from '../src/db/migrations';

test('schema migrations apply once and record their version', () => {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE employees (id INTEGER PRIMARY KEY);
    CREATE TABLE kindergarten_settings (id INTEGER PRIMARY KEY);
    CREATE TABLE daily_menus (id INTEGER PRIMARY KEY, is_confirmed INTEGER DEFAULT 0);
    CREATE TABLE stock_movements (id INTEGER PRIMARY KEY, type TEXT NOT NULL);
    INSERT INTO daily_menus (id, is_confirmed) VALUES (1, 1), (2, 0);
  `);

  runSchemaMigrations(database);
  runSchemaMigrations(database);

  const columns = database.prepare('PRAGMA table_info(employees)').all() as Array<{ name: string }>;
  const settingsColumns = database.prepare('PRAGMA table_info(kindergarten_settings)').all() as Array<{ name: string }>;
  const menuColumns = database.prepare('PRAGMA table_info(daily_menus)').all() as Array<{ name: string }>;
  const menuRows = database.prepare('SELECT id, stock_deducted AS stockDeducted FROM daily_menus ORDER BY id').all();
  const movementColumns = database.prepare('PRAGMA table_info(stock_movements)').all() as Array<{ name: string }>;
  const migrationRows = database.prepare('SELECT version, name FROM sadok_schema_migrations ORDER BY version').all();

  assert.ok(columns.some((column) => column.name === 'status'));
  assert.deepEqual(migrationRows, [
    { version: 1, name: 'employees_status' },
    { version: 2, name: 'notification_center' },
    { version: 3, name: 'license_exact_expiry' },
    { version: 4, name: 'optional_inventory_control' },
    { version: 5, name: 'menu_stock_movement_links' },
  ]);
  assert.ok(settingsColumns.some((column) => column.name === 'license_expires_at'));
  assert.ok(settingsColumns.some((column) => column.name === 'inventory_control_enabled'));
  assert.ok(menuColumns.some((column) => column.name === 'stock_deducted'));
  assert.ok(movementColumns.some((column) => column.name === 'menu_id'));
  assert.ok(movementColumns.some((column) => column.name === 'reversal_of_movement_id'));
  assert.deepEqual(menuRows, [
    { id: 1, stockDeducted: 1 },
    { id: 2, stockDeducted: 0 },
  ]);
  database.close();
});

test('schema migrations accept databases already containing the target column', () => {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE employees (id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'working');
    CREATE TABLE kindergarten_settings (
      id INTEGER PRIMARY KEY,
      license_expires_at INTEGER,
      inventory_control_enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE daily_menus (
      id INTEGER PRIMARY KEY,
      is_confirmed INTEGER DEFAULT 0,
      stock_deducted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      menu_id INTEGER,
      reversal_of_movement_id INTEGER
    );
  `);

  runSchemaMigrations(database);

  const count = database.prepare('SELECT COUNT(*) AS count FROM sadok_schema_migrations').get() as {
    count: number;
  };
  assert.equal(count.count, 5);
  database.close();
});

test('failed migrations roll back schema changes and are not recorded', () => {
  const database = new Database(':memory:');
  const failingMigrations: SchemaMigration[] = [
    {
      version: 1,
      name: 'failing_migration',
      up(db) {
        db.exec('CREATE TABLE should_rollback (id INTEGER PRIMARY KEY)');
        throw new Error('Expected failure');
      },
    },
  ];

  assert.throws(() => runSchemaMigrations(database, failingMigrations), /Expected failure/);
  const table = database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'"
  ).get();
  const count = database.prepare('SELECT COUNT(*) AS count FROM sadok_schema_migrations').get() as {
    count: number;
  };

  assert.equal(table, undefined);
  assert.equal(count.count, 0);
  database.close();
});

test('migration history mismatch stops startup', () => {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE employees (id INTEGER PRIMARY KEY);
    CREATE TABLE sadok_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
    INSERT INTO sadok_schema_migrations VALUES (1, 'unexpected_name', 0);
  `);

  assert.throws(() => runSchemaMigrations(database), /expected 1:employees_status/);
  database.close();
});

test('unknown applied migration versions stop startup', () => {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE employees (id INTEGER PRIMARY KEY);
    CREATE TABLE sadok_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
    INSERT INTO sadok_schema_migrations VALUES (1, 'employees_status', 0);
    INSERT INTO sadok_schema_migrations VALUES (2, 'notification_center', 0);
    INSERT INTO sadok_schema_migrations VALUES (3, 'license_exact_expiry', 0);
    INSERT INTO sadok_schema_migrations VALUES (4, 'optional_inventory_control', 0);
    INSERT INTO sadok_schema_migrations VALUES (5, 'menu_stock_movement_links', 0);
    INSERT INTO sadok_schema_migrations VALUES (6, 'unknown_future_migration', 0);
  `);

  assert.throws(() => runSchemaMigrations(database), /expected no additional migration/);
  database.close();
});

test('gaps in applied migration history stop startup', () => {
  const database = new Database(':memory:');
  const migrations: SchemaMigration[] = [
    { version: 1, name: 'one', up() {} },
    { version: 2, name: 'two', up() {} },
  ];
  database.exec(`
    CREATE TABLE sadok_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
    INSERT INTO sadok_schema_migrations VALUES (2, 'two', 0);
  `);

  assert.throws(() => runSchemaMigrations(database, migrations), /expected 1:one/);
  database.close();
});
