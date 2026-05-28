const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pathsToRemove = [
  'node_modules',
  'apps/client/node_modules',
  'apps/server/node_modules',
  'apps/client/dist',
  'apps/server/dist',
  'apps/client/.vite',
  'apps/server/.vite',
  'apps/client/tsconfig.tsbuildinfo',
  'apps/server/tsconfig.tsbuildinfo',
];

for (const relativePath of pathsToRemove) {
  const targetPath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(targetPath)) {
    continue;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`[clean-portable] removed ${relativePath}`);
}

console.log('[clean-portable] project is ready for transfer and fresh install on another OS');
