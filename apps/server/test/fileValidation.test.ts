import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { assertValidSadokDatabase } from '../src/services/backupValidation';
import { detectImageExtension } from '../src/services/imageValidation';

test('image validation uses file signatures instead of claimed MIME type', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  const webp = Buffer.alloc(12);
  webp.write('RIFF', 0, 'ascii');
  webp.writeUInt32LE(4, 4);
  webp.write('WEBP', 8, 'ascii');

  assert.equal(detectImageExtension(jpeg), '.jpg');
  assert.equal(detectImageExtension(png), '.png');
  assert.equal(detectImageExtension(webp), '.webp');
  assert.equal(detectImageExtension(Buffer.from('<html>not an image</html>')), null);
});

test('backup validation checks integrity and required SADOK tables', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sadok-backup-test-'));

  try {
    const validPath = path.join(tempDir, 'valid.sqlite');
    const validDb = new Database(validPath);
    for (const tableName of ['users', 'kindergarten_settings', 'children', 'employees']) {
      validDb.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`);
    }
    validDb.close();

    assert.doesNotThrow(() => assertValidSadokDatabase(fs.readFileSync(validPath)));

    const incompletePath = path.join(tempDir, 'incomplete.sqlite');
    const incompleteDb = new Database(incompletePath);
    incompleteDb.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    incompleteDb.close();

    assert.throws(
      () => assertValidSadokDatabase(fs.readFileSync(incompletePath)),
      /missing required tables/
    );
    assert.throws(() => assertValidSadokDatabase(Buffer.from('SQLite format 3\0broken')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
