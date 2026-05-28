#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageFiles = [
  path.join(rootDir, 'package.json'),
  path.join(rootDir, 'apps', 'client', 'package.json'),
  path.join(rootDir, 'apps', 'server', 'package.json'),
];

const args = process.argv.slice(2);
const mode = args[0];
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run');

if (showHelp) {
  console.log('Usage: node scripts/bump-version.js <patch|minor|major> [--dry-run]');
  console.log('Examples:');
  console.log('  node scripts/bump-version.js patch');
  console.log('  node scripts/bump-version.js minor --dry-run');
  process.exit(0);
}

if (!['patch', 'minor', 'major'].includes(mode)) {
  console.error('Usage: node scripts/bump-version.js <patch|minor|major> [--dry-run]');
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(packageFiles[0], 'utf8'));
const currentVersion = rootPkg.version;
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some((value) => !Number.isInteger(value) || value < 0)) {
  console.error(`Invalid current version: ${currentVersion}`);
  process.exit(1);
}

const next = [...parts];

if (mode === 'patch') {
  next[2] += 1;
}

if (mode === 'minor') {
  next[1] += 1;
  next[2] = 0;
}

if (mode === 'major') {
  next[0] += 1;
  next[1] = 0;
  next[2] = 0;
}

const nextVersion = next.join('.');

if (!dryRun) {
  for (const file of packageFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.version = nextVersion;
    fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

console.log(`SADOK version ${dryRun ? 'preview' : 'updated'}: ${currentVersion} -> ${nextVersion}`);
console.log('Next required steps: update CHANGELOG.txt and SESSION_NOTES.md');
