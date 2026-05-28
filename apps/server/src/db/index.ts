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
export const db = drizzle(sqlite, { schema });
