const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'apps', 'server');
const sourcePath = path.join(serverDir, 'sqlite.db');
const outputPath = path.join(rootDir, 'server-runtime', 'template', 'sqlite.db');
const Database = require(path.join(serverDir, 'node_modules', 'better-sqlite3'));

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function copyRows(source, target, tableName, whereClause = '', parameters = []) {
  const table = quoteIdentifier(tableName);
  const columns = source.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);

  if (columns.length === 0) {
    throw new Error(`Table not found in source database: ${tableName}`);
  }

  const columnList = columns.map(quoteIdentifier).join(', ');
  const rows = source.prepare(`SELECT ${columnList} FROM ${table} ${whereClause}`).all(...parameters);

  if (rows.length === 0) {
    return 0;
  }

  const placeholders = columns.map(() => '?').join(', ');
  const insert = target.prepare(`INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`);
  const insertRows = target.transaction((items) => {
    for (const row of items) {
      insert.run(columns.map((column) => row[column]));
    }
  });
  insertRows(rows);
  return rows.length;
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source database not found: ${sourcePath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.rmSync(outputPath, { force: true });

  const source = new Database(sourcePath, { readonly: true });
  const target = new Database(outputPath);

  try {
    const schemaObjects = source.prepare(`
      SELECT type, name, sql
      FROM sqlite_master
      WHERE sql IS NOT NULL
        AND name NOT LIKE 'sqlite_%'
      ORDER BY CASE type
        WHEN 'table' THEN 1
        WHEN 'index' THEN 2
        WHEN 'trigger' THEN 3
        WHEN 'view' THEN 4
        ELSE 5
      END, name
    `).all();

    target.pragma('foreign_keys = OFF');
    target.transaction(() => {
      for (const object of schemaObjects) {
        target.exec(object.sql);
      }
    })();

    copyRows(source, target, 'sadok_schema_migrations');
    const adminCount = copyRows(source, target, 'users', 'WHERE username = ? LIMIT 1', ['admin']);
    if (adminCount !== 1) {
      throw new Error('The source database does not contain the required admin user');
    }

    const settingsCount = target.prepare('SELECT COUNT(*) AS count FROM kindergarten_settings').get().count;
    const licensedCount = target.prepare(`
      SELECT COUNT(*) AS count
      FROM kindergarten_settings
      WHERE license_key IS NOT NULL OR activated_at IS NOT NULL OR installation_date IS NOT NULL
    `).get().count;
    const nonAdminUsers = target.prepare("SELECT COUNT(*) AS count FROM users WHERE username <> 'admin'").get().count;

    if (settingsCount !== 0 || licensedCount !== 0 || nonAdminUsers !== 0) {
      throw new Error('Clean template validation failed: customer or license data was found');
    }

    target.pragma('foreign_keys = ON');
    const integrity = target.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`Clean template integrity check failed: ${integrity}`);
    }

    console.log(`[template-db] Clean database created: ${outputPath}`);
  } finally {
    source.close();
    target.close();
  }
}

try {
  main();
} catch (error) {
  console.error('[template-db] Failed to create clean installation database:');
  console.error(error);
  process.exit(1);
}
