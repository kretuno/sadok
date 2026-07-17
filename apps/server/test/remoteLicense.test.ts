import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRemoveInstalledLicense } from '../src/services/remoteLicense';

test('only terminal remote license statuses remove the installed token', () => {
  assert.equal(shouldRemoveInstalledLicense('revoked'), true);
  assert.equal(shouldRemoveInstalledLicense('EXPIRED'), true);
  assert.equal(shouldRemoveInstalledLicense('approved'), false);
  assert.equal(shouldRemoveInstalledLicense('pending'), false);
});
