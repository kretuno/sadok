import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { dataDir } from '../paths';

interface StableSystemUuidOptions {
  directory: string;
  platform?: NodeJS.Platform;
  hostname?: string;
  runCommand?: (command: string) => string;
}

const IDENTITY_FILE_NAME = 'machine-identity';

export const createHostnameFallback = (hostname: string): string =>
  crypto.createHash('md5').update(hostname || 'fallback-host').digest('hex').toUpperCase();

const readWindowsUuid = (runCommand: (command: string) => string): string | null => {
  const commands = [
    'powershell.exe -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"',
    'wmic csproduct get uuid',
  ];

  for (const command of commands) {
    try {
      const output = runCommand(command).trim();
      if (!output || output.length <= 8 || output.includes('Error')) continue;
      const clean = output
        .split(/\r?\n/)
        .find((line) => line.trim() && !line.toUpperCase().includes('UUID'))
        ?.trim();
      return clean || output;
    } catch {}
  }

  return null;
};

export const getStableSystemUuid = (options: StableSystemUuidOptions): string => {
  const identityPath = path.resolve(options.directory, IDENTITY_FILE_NAME);
  try {
    const saved = fs.readFileSync(identityPath, 'utf8').trim();
    if (saved) return saved;
  } catch {}

  const platform = options.platform ?? process.platform;
  const hostname = options.hostname ?? os.hostname();
  const runCommand = options.runCommand ?? ((command: string) =>
    execSync(command, { encoding: 'utf8', timeout: 3000, windowsHide: true }));
  const systemUuid = platform === 'win32'
    ? readWindowsUuid(runCommand) || createHostnameFallback(hostname)
    : createHostnameFallback(hostname);

  fs.mkdirSync(options.directory, { recursive: true });
  fs.writeFileSync(identityPath, `${systemUuid}\n`, { encoding: 'utf8', mode: 0o600 });
  return systemUuid;
};

export const getMachineIdentity = (salt: string) => {
  const rawUuid = getStableSystemUuid({ directory: dataDir });
  const machineId = crypto
    .createHash('sha256')
    .update(rawUuid + salt)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return { rawUuid, machineId };
};
