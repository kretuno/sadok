import assert from 'node:assert/strict';
import test from 'node:test';

import { getLicenseRefreshIntervalMs } from '../src/utils/licenseRefresh.ts';

test('an activated license continues polling for reissued tokens', () => {
  assert.equal(getLicenseRefreshIntervalMs(true), 60_000);
});

test('a pending activation polls more frequently', () => {
  assert.equal(getLicenseRefreshIntervalMs(false), 30_000);
});
