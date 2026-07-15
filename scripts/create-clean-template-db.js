const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'apps', 'server');
const outputPath = path.join(rootDir, 'server-runtime', 'template', 'sqlite.db');
const Database = require(path.join(serverDir, 'node_modules', 'better-sqlite3'));
const bcrypt = require(path.join(serverDir, 'node_modules', 'bcryptjs'));

function createSchema() {
  const npmCommand = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
    : 'npm';
  const npmArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd exec drizzle-kit -- push --force']
    : ['exec', 'drizzle-kit', '--', 'push', '--force'];
  execFileSync(npmCommand, npmArgs, {
    cwd: serverDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      SADOK_SCHEMA_DB_PATH: outputPath,
    },
  });
}

function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.rmSync(outputPath, { force: true });
  createSchema();

  const target = new Database(outputPath);

  try {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    target.prepare(`
      INSERT INTO users
        (full_name, username, password_hash, role, permissions, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Адміністратор Системи',
      'admin',
      passwordHash,
      'admin',
      JSON.stringify({ all: true }),
      1,
      Math.floor(Date.now() / 1000),
    );

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

    const tableCount = target.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).get().count;
    if (tableCount < 10) {
      throw new Error(`Clean template schema is incomplete: only ${tableCount} tables were created`);
    }

    target.pragma('foreign_keys = ON');
    const integrity = target.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`Clean template integrity check failed: ${integrity}`);
    }

    console.log(`[template-db] Clean database created: ${outputPath}`);
  } finally {
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
