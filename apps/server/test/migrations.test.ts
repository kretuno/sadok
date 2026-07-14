import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import {
  runSchemaMigrations,
  type SchemaMigration,
} from '../src/db/migrations';

test('schema migrations apply once and record their version', () => {
  const database = new Database(':memory:');
  database.exec('CREATE TABLE employees (id INTEGER PRIMARY KEY)');

  runSchemaMigrations(database);
  runSchemaMigrations(database);

  const columns = database.prepare('PRAGMA table_info(employees)').all() as Array<{ name: string }>;
  const migrationRows = database.prepare('SELECT version, name FROM sadok_schema_migrations').all();

  assert.ok(columns.some((column) => column.name === 'status'));
  assert.deepEqual(migrationRows, [{ version: 1, name: 'employees_status' }]);
  database.close();
});

test('schema migrations accept databases already containing the target column', () => {
  const database = new Database(':memory:');
  database.exec("CREATE TABLE employees (id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'working')");

  runSchemaMigrations(database);

  const count = database.prepare('SELECT COUNT(*) AS count FROM sadok_schema_migrations').get() as {
    count: number;
  };
  assert.equal(count.count, 1);
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

  assert.throws(() => runSchemaMigrations(database), /expected employees_status/);
  database.close();
});
