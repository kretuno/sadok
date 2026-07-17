import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getLicenseRefreshIntervalMs,
  shouldRefreshSettingsAfterLicenseSync,
} from '../src/utils/licenseRefresh.ts';

test('an activated license continues polling for reissued tokens', () => {
  assert.equal(getLicenseRefreshIntervalMs(true), 60_000);
});

test('a pending activation polls more frequently', () => {
  assert.equal(getLicenseRefreshIntervalMs(false), 30_000);
});

test('global synchronization refreshes settings after renewal or revocation', () => {
  assert.equal(shouldRefreshSettingsAfterLicenseSync({ activated: true, status: 'approved' }), true);
  assert.equal(shouldRefreshSettingsAfterLicenseSync({ activated: false, status: 'revoked' }), true);
  assert.equal(shouldRefreshSettingsAfterLicenseSync({ activated: false, status: 'expired' }), true);
  assert.equal(shouldRefreshSettingsAfterLicenseSync({ activated: false, status: 'pending' }), false);
});
