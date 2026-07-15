import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveInventoryControlEnabled } from '../src/services/inventoryControlPolicy';

test('inventory control remains enabled for existing installations by default', () => {
  assert.equal(resolveInventoryControlEnabled(undefined), true);
  assert.equal(resolveInventoryControlEnabled(null), true);
  assert.equal(resolveInventoryControlEnabled(true), true);
});

test('inventory control can be explicitly disabled', () => {
  assert.equal(resolveInventoryControlEnabled(false), false);
});
