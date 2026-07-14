import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultPermissionMatrix,
  hasPermission,
  normalizePermissionMatrix,
  permissionModules,
} from '../src/services/permissions';

test('default permissions preserve read and print access only', () => {
  const matrix = createDefaultPermissionMatrix();

  for (const module of permissionModules) {
    assert.deepEqual(matrix.modules[module], {
      view: true,
      edit: false,
      delete: false,
      print: true,
    });
  }
});

test('legacy permissions are normalized without losing access', () => {
  const matrix = normalizePermissionMatrix(JSON.stringify({
    inventory: true,
    children: 'edit',
    medical: 'view',
  }));

  assert.deepEqual(matrix.modules.inventory, {
    view: true,
    edit: true,
    delete: true,
    print: true,
  });
  assert.deepEqual(matrix.modules.children, {
    view: true,
    edit: true,
    delete: false,
    print: true,
  });
  assert.deepEqual(matrix.modules.medical, {
    view: true,
    edit: false,
    delete: false,
    print: true,
  });
});

test('version 2 permissions do not inherit unspecified actions', () => {
  const matrix = normalizePermissionMatrix({
    version: 2,
    modules: {
      reports: { view: true, print: false },
    },
  });

  assert.deepEqual(matrix.modules.reports, {
    view: true,
    edit: false,
    delete: false,
    print: false,
  });
  assert.deepEqual(matrix.modules.inventory, {
    view: false,
    edit: false,
    delete: false,
    print: false,
  });
});

test('dependent actions imply view permission', () => {
  const matrix = normalizePermissionMatrix({
    version: 2,
    modules: {
      reports: { view: false, edit: true, delete: false, print: false },
    },
  });

  assert.deepEqual(matrix.modules.reports, {
    view: true,
    edit: true,
    delete: false,
    print: false,
  });
});

test('admin role bypasses the module matrix', () => {
  const denied = normalizePermissionMatrix({ version: 2, modules: {} });

  assert.equal(hasPermission('admin', denied, 'reports', 'delete'), true);
  assert.equal(hasPermission('user', denied, 'reports', 'delete'), false);
});
