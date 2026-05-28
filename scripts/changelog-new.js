#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const changelogPath = path.join(rootDir, 'CHANGELOG.txt');

const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run');
const version = args.find((arg) => !arg.startsWith('--'));

if (showHelp || !version) {
  console.log('Usage: node scripts/changelog-new.js <version> [--dry-run]');
  console.log('Examples:');
  console.log('  node scripts/changelog-new.js 1.0.51');
  console.log('  node scripts/changelog-new.js 1.1.0 --dry-run');
  process.exit(showHelp ? 0 : 1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

if (!fs.existsSync(changelogPath)) {
  console.error(`CHANGELOG not found: ${changelogPath}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const content = fs.readFileSync(changelogPath, 'utf8');

if (content.includes(`[${version}] - `)) {
  console.error(`Entry for version ${version} already exists in CHANGELOG.txt`);
  process.exit(1);
}

const header = '#SADOK CHANGELOG';
const headerLine = '================';
const template = `[${version}] - ${today}
---------------------
### Додано
- ...

### Змінено
- ...

### Виправлено
- ...

### Технічне
- ...

`;

let nextContent;

if (content.startsWith(`${header}\n${headerLine}\n\n`)) {
  nextContent = `${header}\n${headerLine}\n\n${template}${content.slice(`${header}\n${headerLine}\n\n`.length)}`;
} else if (content.startsWith(`${header}\r\n${headerLine}\r\n\r\n`)) {
  const normalizedTemplate = template.replace(/\n/g, '\r\n');
  nextContent = `${header}\r\n${headerLine}\r\n\r\n${normalizedTemplate}${content.slice(`${header}\r\n${headerLine}\r\n\r\n`.length)}`;
} else {
  console.error('Unexpected CHANGELOG.txt header format');
  process.exit(1);
}

if (dryRun) {
  console.log(template.trimEnd());
  process.exit(0);
}

fs.writeFileSync(changelogPath, nextContent);
console.log(`CHANGELOG template added for version ${version} (${today})`);
