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
];

const assertMigrationSequence = (migrations: readonly SchemaMigration[]) => {
  let previousVersion = 0;
  const names = new Set<string>();

  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version <= previousVersion) {
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
