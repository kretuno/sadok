import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createHostnameFallback, getStableSystemUuid } from '../src/services/machineIdentity';

test('macOS fallback remains stable after the computer name changes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sadok-machine-'));
  try {
    const first = getStableSystemUuid({ directory, platform: 'darwin', hostname: 'Office-Mac' });
    const second = getStableSystemUuid({ directory, platform: 'darwin', hostname: 'Renamed-Mac' });

    assert.equal(first, createHostnameFallback('Office-Mac'));
    assert.equal(second, first);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Windows UUID is persisted and reused without a second system command', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sadok-machine-'));
  let calls = 0;
  try {
    const first = getStableSystemUuid({
      directory,
      platform: 'win32',
      hostname: 'Office-PC',
      runCommand: () => {
        calls += 1;
        return '4C4C4544-0038-3710-8051-CAC04F4B3332\n';
      },
    });
    const second = getStableSystemUuid({
      directory,
      platform: 'win32',
      hostname: 'Renamed-PC',
      runCommand: () => {
        throw new Error('must not run after persistence');
      },
    });

    assert.equal(first, '4C4C4544-0038-3710-8051-CAC04F4B3332');
    assert.equal(second, first);
    assert.equal(calls, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
