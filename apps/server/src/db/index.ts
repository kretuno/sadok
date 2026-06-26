import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';
import { dataDir, ensureDir } from '../paths';

ensureDir(dataDir);

const dbPath = path.join(dataDir, 'sqlite.db');

function getTemplateDbPath() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'sqlite.db'),
    path.resolve((process as NodeJS.Process & { resourcesPath?: string }).resourcesPath || process.cwd(), 'server-template', 'sqlite.db'),
    path.resolve(process.cwd(), 'apps', 'server', 'sqlite.db'),
    path.resolve(process.cwd(), 'sqlite.db'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function hasUsersTable(filePath: string) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return false;
  }

  try {
    const checkDb = new Database(filePath, { readonly: true });
    const row = checkDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
      .get();
    checkDb.close();
    return Boolean(row);
  } catch {
    return false;
  }
}

if (!hasUsersTable(dbPath)) {
  const templateDbPath = getTemplateDbPath();

  if (templateDbPath) {
    fs.copyFileSync(templateDbPath, dbPath);
    console.log(`[DB] Initialized database from template: ${templateDbPath}`);
  } else {
    console.warn('[DB] Database template not found. Starting with an empty database.');
  }
}

const sqlite = new Database(dbPath);

// Автоматична міграція: додавання колонки status у таблицю employees
try {
  const tableInfo = sqlite.prepare("PRAGMA table_info(employees)").all() as Array<{ name: string }>;
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('status')) {
    sqlite.prepare("ALTER TABLE employees ADD COLUMN status TEXT NOT NULL DEFAULT 'working'").run();
    console.log('[DB] Added status column to employees table.');
  }
} catch (err) {
  console.error('[DB] Failed to migrate employees table:', err);
}

// Автоматичне виправлення поламаного хешу пароля адміністратора
try {
  const brokenHash = '$2b$10$3Ei2EkgO1GwUHgGJf7ugMe/it7Se4Id1LlQxRx1zhwhIBd5COPKsW';
  const row = sqlite.prepare("SELECT id, password_hash FROM users WHERE username = 'admin'").get() as { id: number, password_hash: string } | undefined;
  if (row && row.password_hash === brokenHash) {
    const bcrypt = require('bcryptjs');
    const newHash = bcrypt.hashSync('admin123', 10);
    sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, row.id);
    console.log('[DB] Поламаний хеш пароля адміністратора автоматично виправлено на admin123!');
  }
} catch (err) {
  console.error('[DB] Не вдалося перевірити/виправити поламаний пароль адміністратора:', err);
}

export const db = drizzle(sqlite, { schema });
