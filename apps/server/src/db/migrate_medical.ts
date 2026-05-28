import Database from 'better-sqlite3';
import path from 'path';

console.log('Running medical tables migration...');

const dbPath = path.resolve(__dirname, '../../sqlite.db');
const db = new Database(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS illnesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      diagnosis TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER,
      quarantine_end_date INTEGER,
      isolation_ward INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      vaccine_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      plan_date INTEGER,
      date_given INTEGER,
      notes TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      expiry_date INTEGER,
      notes TEXT,
      created_at INTEGER
    );
  `);
  console.log("Medical tables built successfully");
} catch (e) {
  console.error("Failed to execute DB migration", e);
}
