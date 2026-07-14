import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const REQUIRED_TABLES = ['users', 'kindergarten_settings', 'children', 'employees'] as const;

export const assertValidSadokDatabase = (buffer: Buffer) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sadok-restore-'));
  const candidatePath = path.join(tempDir, 'candidate.sqlite');
  let candidate: Database.Database | undefined;

  try {
    fs.writeFileSync(candidatePath, buffer);
    candidate = new Database(candidatePath, { readonly: true, fileMustExist: true });

    const quickCheck = candidate.pragma('quick_check') as Array<{ quick_check: string }>;
    if (quickCheck.length !== 1 || quickCheck[0].quick_check !== 'ok') {
      throw new Error('SQLite integrity check failed');
    }

    const rows = candidate.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all() as Array<{ name: string }>;
    const tableNames = new Set(rows.map((row) => row.name));
    const missingTables = REQUIRED_TABLES.filter((tableName) => !tableNames.has(tableName));

    if (missingTables.length > 0) {
      throw new Error(`Backup is missing required tables: ${missingTables.join(', ')}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Backup is missing')) throw error;
    throw new Error('Файл не є коректною базою SADOK');
  } finally {
    candidate?.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
