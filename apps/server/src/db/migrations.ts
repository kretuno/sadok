import type Database from 'better-sqlite3';

const MIGRATIONS_TABLE = 'sadok_schema_migrations';

export interface SchemaMigration {
  version: number;
  name: string;
  up: (database: Database.Database) => void;
}

const tableExists = (database: Database.Database, tableName: string) =>
  Boolean(database.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(tableName));

const columnExists = (database: Database.Database, tableName: string, columnName: string) => {
  if (!tableExists(database, tableName)) return false;
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
};

// Append new entries only. Applied versions are immutable once released.
export const schemaMigrations: readonly SchemaMigration[] = [
  {
    version: 1,
    name: 'employees_status',
    up(database) {
      if (!tableExists(database, 'employees')) {
        throw new Error('Cannot migrate: employees table is missing');
      }
      if (!columnExists(database, 'employees', 'status')) {
        database.exec("ALTER TABLE employees ADD COLUMN status TEXT NOT NULL DEFAULT 'working'");
      }
    },
  },
  {
    version: 2,
    name: 'notification_center',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS system_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fingerprint TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          module TEXT,
          severity TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          action_path TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          first_seen_at INTEGER NOT NULL,
          last_seen_at INTEGER NOT NULL,
          resolved_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS notification_user_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_id INTEGER NOT NULL REFERENCES system_notifications(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          read_at INTEGER,
          snoozed_until INTEGER,
          dismissed_at INTEGER
        );
        CREATE UNIQUE INDEX IF NOT EXISTS notification_user_state_unique
          ON notification_user_states(notification_id, user_id);
        CREATE INDEX IF NOT EXISTS system_notifications_active_idx
          ON system_notifications(resolved_at, severity, last_seen_at);
      `);
    },
  },
  {
    version: 3,
    name: 'license_exact_expiry',
    up(database) {
      if (!tableExists(database, 'kindergarten_settings')) {
        throw new Error('Cannot migrate: kindergarten_settings table is missing');
      }
      if (!columnExists(database, 'kindergarten_settings', 'license_expires_at')) {
        database.exec('ALTER TABLE kindergarten_settings ADD COLUMN license_expires_at INTEGER');
      }
    },
  },
  {
    version: 4,
    name: 'optional_inventory_control',
    up(database) {
      if (!tableExists(database, 'kindergarten_settings')) {
        throw new Error('Cannot migrate: kindergarten_settings table is missing');
      }
      if (!tableExists(database, 'daily_menus')) {
        throw new Error('Cannot migrate: daily_menus table is missing');
      }
      if (!columnExists(database, 'kindergarten_settings', 'inventory_control_enabled')) {
        database.exec(
          'ALTER TABLE kindergarten_settings ADD COLUMN inventory_control_enabled INTEGER NOT NULL DEFAULT 1'
        );
      }
      if (!columnExists(database, 'daily_menus', 'stock_deducted')) {
        database.exec('ALTER TABLE daily_menus ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0');
        database.exec('UPDATE daily_menus SET stock_deducted = 1 WHERE is_confirmed = 1');
      }
    },
  },
  {
    version: 5,
    name: 'menu_stock_movement_links',
    up(database) {
      if (!tableExists(database, 'stock_movements')) {
        throw new Error('Cannot migrate: stock_movements table is missing');
      }
      if (!columnExists(database, 'stock_movements', 'menu_id')) {
        database.exec('ALTER TABLE stock_movements ADD COLUMN menu_id INTEGER');
      }
      if (!columnExists(database, 'stock_movements', 'reversal_of_movement_id')) {
        database.exec('ALTER TABLE stock_movements ADD COLUMN reversal_of_movement_id INTEGER');
      }
      database.exec(`
        CREATE INDEX IF NOT EXISTS stock_movements_menu_idx
          ON stock_movements(menu_id, type);
        CREATE INDEX IF NOT EXISTS stock_movements_reversal_idx
          ON stock_movements(reversal_of_movement_id);
      `);
    },
  },
];

const assertMigrationSequence = (migrations: readonly SchemaMigration[]) => {
  let previousVersion = 0;
  const names = new Set<string>();

  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version !== previousVersion + 1) {
      throw new Error(`Invalid migration order at version ${migration.version}`);
    }
    if (!migration.name || names.has(migration.name)) {
      throw new Error(`Invalid or duplicate migration name: ${migration.name}`);
    }
    previousVersion = migration.version;
    names.add(migration.name);
  }
};

export const runSchemaMigrations = (
  database: Database.Database,
  migrations: readonly SchemaMigration[] = schemaMigrations
) => {
  assertMigrationSequence(migrations);
  database.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);

  const appliedRows = database.prepare(
    `SELECT version, name FROM ${MIGRATIONS_TABLE} ORDER BY version`
  ).all() as Array<{ version: number; name: string }>;

  for (let index = 0; index < appliedRows.length; index += 1) {
    const appliedMigration = appliedRows[index];
    const expectedMigration = migrations[index];

    if (
      !expectedMigration ||
      appliedMigration.version !== expectedMigration.version ||
      appliedMigration.name !== expectedMigration.name
    ) {
      const expected = expectedMigration
        ? `${expectedMigration.version}:${expectedMigration.name}`
        : 'no additional migration';
      throw new Error(
        `Migration history diverged at ${appliedMigration.version}:${appliedMigration.name}; expected ${expected}`
      );
    }
  }

  const applied = new Map(appliedRows.map((row) => [row.version, row.name]));

  for (const migration of migrations) {
    const appliedName = applied.get(migration.version);
    if (appliedName) {
      if (appliedName !== migration.name) {
        throw new Error(
          `Migration ${migration.version} was recorded as ${appliedName}, expected ${migration.name}`
        );
      }
      continue;
    }

    database.transaction(() => {
      migration.up(database);
      database.prepare(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`
      ).run(migration.version, migration.name, Date.now());
    })();

    console.log(`[DB] Applied migration ${migration.version}: ${migration.name}`);
  }
};
